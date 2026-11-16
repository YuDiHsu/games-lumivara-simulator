"""Wiki & Changelog Scraper with Live HTTP + Vite JS-Bundle Parsing and Verified Seed Fallback."""

from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any, Dict
from urllib.parse import urljoin

import httpx

from backend.scraper.parsers import (
    build_card_description_zh,
    is_limited_card,
    localize_snapshot_to_zh,
    normalize_bonuses,
    normalize_slots,
    parse_changelog_html,
    parse_job_page_html,
    parse_wiki_bundle_js,
    parse_wiki_html,
)
from backend.scraper.seed_data import (
    SEED_ARMOR_SETS,
    SEED_CARDS,
    SEED_CARD_MECHANICS,
    SEED_CARD_MECHANICS_PARAMS,
    SEED_CROSS_PASSIVES,
    SEED_EQUIPMENT,
    SEED_EQUIPMENT_AFFIX_SYSTEM,
    SEED_JOBS,
    SEED_MONSTERS,
    SEED_SKILLS,
)

WIKI_BASE_ORIGIN = "https://lumivaraonline.com"
WIKI_URL = "https://lumivaraonline.com/wiki/"
CHANGELOG_URL = "https://lumivaraonline.com/changelog/"


def _apply_live_bundle_updates(
    cards: list[Dict[str, Any]],
    armor_sets: list[Dict[str, Any]],
    monsters: list[Dict[str, Any]],
    skills: list[Dict[str, Any]],
    bundle_data: Dict[str, Any],
) -> Dict[str, int]:
    """Merge live-parsed Wiki JS bundle data onto the baseline structures."""
    updated_counts = {"cards": 0, "armor_sets": 0, "monsters": 0, "skills": 0}

    live_cards = bundle_data.get("cards") or {}
    live_slots = bundle_data.get("card_slots") or {}
    live_sources = bundle_data.get("card_sources") or {}
    if live_cards:
        cards_by_id = {c["id"]: c for c in cards}
        for ckey, lc in live_cards.items():
            norm_b = normalize_bonuses(lc.get("bonuses"))
            raw_slots = live_slots.get(ckey)
            if ckey in cards_by_id:
                target = cards_by_id[ckey]
                if lc.get("name"):
                    target["name"] = str(lc["name"])
                if norm_b:
                    target["bonuses"] = norm_b
                    target["mechanics"] = [k for k in norm_b if k in SEED_CARD_MECHANICS]
                if raw_slots:
                    p_slot, n_slots = normalize_slots(raw_slots)
                    target["slot"] = p_slot
                    target["slots"] = n_slots
                if ckey in live_sources:
                    target["source_monsters"] = list(live_sources[ckey])
                updated_counts["cards"] += 1
            else:
                p_slot, n_slots = normalize_slots(raw_slots or ["all"])
                srcs = list(live_sources.get(ckey, []))
                new_card = {
                    "id": ckey,
                    "name": str(lc.get("name") or ckey),
                    "slot": p_slot,
                    "tier": None,
                    "slots": n_slots,
                    "source_monsters": srcs,
                    "removable": True,
                    "max_per_item": 1,
                    "is_limited": is_limited_card(ckey, srcs),
                    "bonuses": norm_b,
                    "mechanics": [k for k in norm_b if k in SEED_CARD_MECHANICS],
                    "description": "",
                }
                new_card["description"] = build_card_description_zh(new_card)
                cards.append(new_card)
                updated_counts["cards"] += 1

    live_sets = bundle_data.get("armor_sets") or {}
    if live_sets:
        sets_by_id = {s["id"]: s for s in armor_sets}
        for skey, ls in live_sets.items():
            norm_b = normalize_bonuses(ls.get("bonuses"))
            if skey in sets_by_id:
                target = sets_by_id[skey]
                if ls.get("name"):
                    target["name"] = str(ls["name"])
                if ls.get("pieces"):
                    target["pieces_required"] = int(ls["pieces"])
                if ls.get("rarity"):
                    target["rarity"] = str(ls["rarity"])
                if norm_b:
                    target["bonuses"] = norm_b
                updated_counts["armor_sets"] += 1
            else:
                armor_sets.append(
                    {
                        "id": skey,
                        "name": str(ls.get("name") or skey),
                        "pieces_required": int(ls.get("pieces") or 2),
                        "rarity": str(ls.get("rarity") or "common"),
                        "max_stacks": 1,
                        "eligible_slots": ["head", "face", "mouth", "armor", "garment", "shoes"],
                        "bonuses": norm_b,
                        "description": f"Live Wiki armor set: {ls.get('name') or skey}",
                    }
                )
                updated_counts["armor_sets"] += 1

    live_monsters = bundle_data.get("monsters") or {}
    if live_monsters:
        monsters_by_id = {m["id"]: m for m in monsters}
        for mkey, lm in live_monsters.items():
            if mkey in monsters_by_id:
                target = monsters_by_id[mkey]
                target["name"] = str(lm.get("name") or target["name"])
                target["level"] = int(lm.get("level") or target["level"])
                target["hp"] = int(lm.get("hp") or target["hp"])
                target["def"] = int(lm.get("def") if lm.get("def") is not None else target["def"])
                target["mdef"] = int(lm.get("mdef") if lm.get("mdef") is not None else target["mdef"])
                target["hit"] = int(lm.get("hit") if lm.get("hit") is not None else target["hit"])
                target["flee"] = int(lm.get("flee") if lm.get("flee") is not None else target["flee"])
                updated_counts["monsters"] += 1

    gld = bundle_data.get("templar_devastation") or {}
    if gld and gld.get("atk") and gld.get("hp") and gld.get("cooldown"):
        for sk in skills:
            if sk["id"] == "lightdevastation":
                sk["atk_scale"] = round(float(gld["atk"][-1]), 4)
                sk["hp_scale"] = round(float(gld["hp"][-1][-1]), 4)
                cd_sec = round(float(gld["cooldown"][-1]) / 1000.0, 3)
                sk["cooldown"] = cd_sec
                sk["effective_uptime_cd"] = cd_sec
                updated_counts["skills"] += 1

    return updated_counts


def fetch_wiki_snapshot(
    fetch_live: bool = True,
    simulate_patch: bool = False,
    timeout: float = 8.0,
) -> Dict[str, Any]:
    """
    Fetch structured game data from Lumivara Online Wiki, JS data bundle, Job pages,
    and Changelog. Falls back gracefully to the Wiki-verified seed snapshot (`seed_data.py`)
    when offline or when `fetch_live=False`.
    When `simulate_patch=True`, mutates `lightdevastation` and `lm01_limited_card` so the
    CDC engine detects live SHA-256 hash diffs and records MODIFIED events.
    """
    jobs = copy.deepcopy(SEED_JOBS)
    skills = copy.deepcopy(SEED_SKILLS)
    cross_passives = copy.deepcopy(SEED_CROSS_PASSIVES)
    armor_sets = copy.deepcopy(SEED_ARMOR_SETS)
    cards = copy.deepcopy(SEED_CARDS)
    equipment = copy.deepcopy(SEED_EQUIPMENT)
    monsters = copy.deepcopy(SEED_MONSTERS)

    live_meta: Dict[str, Any] = {
        "live_attempted": fetch_live,
        "wiki_reachable": False,
        "bundle_parsed": False,
        "changelog_reachable": False,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "patch_version": "2026-11-15",
    }

    if fetch_live:
        headers = {
            "User-Agent": "LumivaraOptimizerBot/2.0 (+https://lumivaraonline.com/wiki/)"
        }
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
                wiki_resp = client.get(WIKI_URL)
                if wiki_resp.status_code == 200 and wiki_resp.text:
                    live_meta["wiki_reachable"] = True
                    wiki_parsed = parse_wiki_html(wiki_resp.text)
                    live_meta["wiki_parsed"] = {
                        "title": wiki_parsed["title"],
                        "headings_count": wiki_parsed["headings_count"],
                        "bundle_paths": wiki_parsed["bundle_paths"],
                    }

                    for bpath in wiki_parsed.get("bundle_paths", []):
                        if "wiki-" in bpath:
                            burl = urljoin(WIKI_BASE_ORIGIN, bpath)
                            b_resp = client.get(burl)
                            if b_resp.status_code == 200 and b_resp.text:
                                bundle_data = parse_wiki_bundle_js(b_resp.text)
                                merged_counts = _apply_live_bundle_updates(
                                    cards=cards,
                                    armor_sets=armor_sets,
                                    monsters=monsters,
                                    skills=skills,
                                    bundle_data=bundle_data,
                                )
                                live_meta["bundle_parsed"] = True
                                live_meta["bundle_url"] = burl
                                live_meta["bundle_merged_counts"] = merged_counts
                            break

                # Spot-check Templar job page HTML
                templar_resp = client.get(f"{WIKI_BASE_ORIGIN}/wiki/jobs/templar/")
                if templar_resp.status_code == 200 and templar_resp.text:
                    job_parsed = parse_job_page_html(templar_resp.text, "templar")
                    live_meta["templar_job_skills_parsed"] = len(job_parsed["skills_parsed"])

                cl_resp = client.get(CHANGELOG_URL)
                if cl_resp.status_code == 200 and cl_resp.text:
                    live_meta["changelog_reachable"] = True
                    patches = parse_changelog_html(cl_resp.text)
                    live_meta["changelog_patches"] = len(patches)
                    if patches:
                        live_meta["patch_version"] = patches[0]["patch_version"]
        except Exception as exc:
            live_meta["fallback_reason"] = f"Live fetch fell back to verified seed data: {type(exc).__name__}"

    if simulate_patch:
        live_meta["patch_version"] = "2026-11-15-sim"
        for sk in skills:
            if sk["id"] == "lightdevastation":
                sk["atk_scale"] = 55.0
                sk["cooldown"] = 8.0
                sk["effective_uptime_cd"] = 8.0
                sk["description"] = (
                    "Lv.10 [Simulated Patch]: Grand Light Devastation buffed to 5500% ATK "
                    "(CD 8.0s) + VIT-tiered MaxHP scaling, +50% vs monsters."
                )
        for card in cards:
            if card["id"] == "lm01_limited_card":
                card["bonuses"]["crit_dmg"] = 0.25
                card["bonuses"]["atk_pct"] = 0.08
                card["description"] = (
                    "[Simulated Patch - LM-01 Limited] Critical King Card: "
                    "ATK +8%, MATK +5%, CRIT +7%, MCRIT +7%, Crit Damage +25%, Earth Damage +20%."
                )

    snapshot = {
        "jobs": jobs,
        "skills": skills,
        "cross_passives": cross_passives,
        "armor_sets": armor_sets,
        "cards": cards,
        "equipment": equipment,
        "monsters": monsters,
        "card_mechanics": copy.deepcopy(SEED_CARD_MECHANICS),
        "card_mechanics_params": copy.deepcopy(SEED_CARD_MECHANICS_PARAMS),
        "equipment_affix_system": copy.deepcopy(SEED_EQUIPMENT_AFFIX_SYSTEM),
        "meta": live_meta,
    }
    return localize_snapshot_to_zh(snapshot)

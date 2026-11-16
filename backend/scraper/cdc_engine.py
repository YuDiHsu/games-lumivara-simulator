"""CDC (Change Data Capture) Engine using Canonical JSON SHA-256 Hashing and Field-Level Diffing."""

from __future__ import annotations

import hashlib
import json
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.db.database import get_cdc_changes, get_cdc_status, get_connection, init_db
from backend.scraper.seed_data import SEED_INITIAL_CDC_CHANGES
from backend.scraper.wiki_scraper import fetch_wiki_snapshot

VOLATILE_KEYS = {"updated_at", "detected_at"}


def _strip_volatile(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _strip_volatile(v) for k, v in sorted(obj.items()) if k not in VOLATILE_KEYS}
    if isinstance(obj, list):
        return [_strip_volatile(x) for x in obj]
    return obj


def canonical_json(entity: Dict[str, Any]) -> str:
    """Serialize an entity dictionary into deterministic Canonical JSON."""
    cleaned = _strip_volatile(entity)
    return json.dumps(cleaned, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_canonical_hash(entity: Dict[str, Any]) -> str:
    """Compute a SHA-256 hex digest of an entity's Canonical JSON representation."""
    payload = canonical_json(entity).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _flatten_dict(d: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    items: Dict[str, Any] = {}
    for k, v in d.items():
        if k in VOLATILE_KEYS:
            continue
        key_path = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            items.update(_flatten_dict(v, key_path))
        else:
            items[key_path] = v
    return items


def compute_field_diff(old_entity: Dict[str, Any], new_entity: Dict[str, Any]) -> Tuple[Dict[str, Dict[str, Any]], str]:
    """Compare two entity snapshots and return a structured field diff dict and human-readable summary."""
    old_flat = _flatten_dict(old_entity)
    new_flat = _flatten_dict(new_entity)
    all_keys = sorted(set(old_flat.keys()) | set(new_flat.keys()))

    diffs: Dict[str, Dict[str, Any]] = {}
    summary_parts: List[str] = []

    for k in all_keys:
        old_val = old_flat.get(k)
        new_val = new_flat.get(k)
        if old_val != new_val:
            diffs[k] = {"old": old_val, "new": new_val}
            if k != "description":
                summary_parts.append(f"{k}: {old_val} -> {new_val}")

    if not summary_parts and "description" in diffs:
        summary_parts.append("Updated description text")

    entity_name = new_entity.get("name", new_entity.get("id", "Entity"))
    summary = f"{entity_name} modified ({', '.join(summary_parts)})" if summary_parts else f"{entity_name} updated"
    return diffs, summary


def _infer_affected_jobs(entity_type: str, entity: Dict[str, Any]) -> List[str]:
    if entity_type == "job":
        return [entity["id"]]
    if entity_type == "skill":
        return [entity["job_id"]]
    if entity_type == "equipment":
        allowed = entity.get("allowed_jobs", ["all"])
        return allowed if isinstance(allowed, list) else ["all"]
    return ["all"]


def _upsert_domain_tables(conn: Any, snapshot: Dict[str, Any], now_iso: str) -> None:
    """Upsert all 7 domain tables inside an active SQLite transaction."""
    for j in snapshot["jobs"]:
        conn.execute(
            """
            INSERT INTO jobs (
                id, name, tier, role_summary, is_melee, base_aspd,
                auto_atk_scale, auto_hp_scale, job_bonuses_json, innate_stats_json,
                allowed_weapons_json, active_stats_json, hp_bonus_pct, sp_bonus_pct,
                max_job_level, wiki_url, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                tier = excluded.tier,
                role_summary = excluded.role_summary,
                is_melee = excluded.is_melee,
                base_aspd = excluded.base_aspd,
                auto_atk_scale = excluded.auto_atk_scale,
                auto_hp_scale = excluded.auto_hp_scale,
                job_bonuses_json = excluded.job_bonuses_json,
                innate_stats_json = excluded.innate_stats_json,
                allowed_weapons_json = excluded.allowed_weapons_json,
                active_stats_json = excluded.active_stats_json,
                hp_bonus_pct = excluded.hp_bonus_pct,
                sp_bonus_pct = excluded.sp_bonus_pct,
                max_job_level = excluded.max_job_level,
                wiki_url = excluded.wiki_url,
                updated_at = excluded.updated_at
            """,
            (
                j["id"],
                j["name"],
                j["tier"],
                j["role_summary"],
                1 if j.get("is_melee", True) else 0,
                float(j.get("base_aspd", 150.0)),
                float(j.get("auto_atk_scale", 1.0)),
                float(j.get("auto_hp_scale", 0.0)),
                json.dumps(j.get("job_bonuses", {}), sort_keys=True),
                json.dumps(j.get("innate_stats", {}), sort_keys=True),
                json.dumps(j.get("allowed_weapons", [])),
                json.dumps(j.get("active_stats", [])),
                float(j.get("hp_bonus_pct", 0.0)),
                float(j.get("sp_bonus_pct", 0.0)),
                int(j.get("max_job_level", 70)),
                j.get("wiki_url", "https://lumivaraonline.com/wiki/"),
                now_iso,
            ),
        )

    for sk in snapshot["skills"]:
        conn.execute(
            """
            INSERT INTO skills (
                id, job_id, name, skill_type, dmg_type, atk_scale, matk_scale,
                hp_scale, vit_tier_hp_scale, str_eq_int_bonus, element,
                uses_weapon_coating, cooldown, effective_uptime_cd, cast_time,
                hits, never_misses, can_crit, monster_mult, monster_damage_applies_to,
                aspd_scaling_type, cooldown_from_aspd, aspd_floor,
                description, description_lv10, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                job_id = excluded.job_id,
                name = excluded.name,
                skill_type = excluded.skill_type,
                dmg_type = excluded.dmg_type,
                atk_scale = excluded.atk_scale,
                matk_scale = excluded.matk_scale,
                hp_scale = excluded.hp_scale,
                vit_tier_hp_scale = excluded.vit_tier_hp_scale,
                str_eq_int_bonus = excluded.str_eq_int_bonus,
                element = excluded.element,
                uses_weapon_coating = excluded.uses_weapon_coating,
                cooldown = excluded.cooldown,
                effective_uptime_cd = excluded.effective_uptime_cd,
                cast_time = excluded.cast_time,
                hits = excluded.hits,
                never_misses = excluded.never_misses,
                can_crit = excluded.can_crit,
                monster_mult = excluded.monster_mult,
                monster_damage_applies_to = excluded.monster_damage_applies_to,
                aspd_scaling_type = excluded.aspd_scaling_type,
                cooldown_from_aspd = excluded.cooldown_from_aspd,
                aspd_floor = excluded.aspd_floor,
                description = excluded.description,
                description_lv10 = excluded.description_lv10,
                updated_at = excluded.updated_at
            """,
            (
                sk["id"],
                sk["job_id"],
                sk["name"],
                sk.get("skill_type", "active"),
                sk.get("dmg_type", "physical"),
                float(sk.get("atk_scale", 0.0)),
                float(sk.get("matk_scale", 0.0)),
                float(sk.get("hp_scale", 0.0)),
                1 if sk.get("vit_tier_hp_scale") else 0,
                float(sk.get("str_eq_int_bonus", 0.0)),
                sk.get("element", "neutral"),
                1 if sk.get("uses_weapon_coating") else 0,
                float(sk.get("cooldown", 1.0)),
                float(sk["effective_uptime_cd"]) if sk.get("effective_uptime_cd") is not None else None,
                float(sk.get("cast_time", 0.0)),
                int(sk.get("hits", 1)),
                1 if sk.get("never_misses") else 0,
                1 if sk.get("can_crit", True) else 0,
                float(sk.get("monster_mult", 1.0)),
                sk.get("monster_damage_applies_to", "total_damage"),
                sk.get("aspd_scaling_type", "fixed_cooldown"),
                1 if sk.get("cooldown_from_aspd") else 0,
                1 if sk.get("aspd_floor") else 0,
                sk.get("description", ""),
                sk.get("description_lv10", sk.get("description", "")),
                now_iso,
            ),
        )

    for p in snapshot["cross_passives"]:
        conn.execute(
            """
            INSERT INTO cross_passives (
                id, name, source_job, restriction, stats_json, description, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                source_job = excluded.source_job,
                restriction = excluded.restriction,
                stats_json = excluded.stats_json,
                description = excluded.description,
                updated_at = excluded.updated_at
            """,
            (
                p["id"],
                p["name"],
                p["source_job"],
                p.get("restriction", "all"),
                json.dumps(p.get("stats", {}), sort_keys=True),
                p.get("description", ""),
                now_iso,
            ),
        )

    for eq in snapshot["equipment"]:
        conn.execute(
            """
            INSERT INTO equipment (
                id, name, slot, tier, weapon_type, is_two_handed,
                stats_json, allowed_jobs_json, description, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                slot = excluded.slot,
                tier = excluded.tier,
                weapon_type = excluded.weapon_type,
                is_two_handed = excluded.is_two_handed,
                stats_json = excluded.stats_json,
                allowed_jobs_json = excluded.allowed_jobs_json,
                description = excluded.description,
                updated_at = excluded.updated_at
            """,
            (
                eq["id"],
                eq["name"],
                eq["slot"],
                int(eq.get("tier", 6)),
                eq.get("weapon_type"),
                1 if eq.get("is_two_handed") else 0,
                json.dumps(eq.get("stats", {}), sort_keys=True),
                json.dumps(eq.get("allowed_jobs", ["all"])),
                eq.get("description", ""),
                now_iso,
            ),
        )

    for s in snapshot["armor_sets"]:
        conn.execute(
            """
            INSERT INTO armor_sets (
                id, name, pieces_required, rarity, max_stacks, eligible_slots_json,
                bonuses_json, description, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                pieces_required = excluded.pieces_required,
                rarity = excluded.rarity,
                max_stacks = excluded.max_stacks,
                eligible_slots_json = excluded.eligible_slots_json,
                bonuses_json = excluded.bonuses_json,
                description = excluded.description,
                updated_at = excluded.updated_at
            """,
            (
                s["id"],
                s["name"],
                int(s.get("pieces_required", 2)),
                s.get("rarity", "common"),
                int(s.get("max_stacks", 1)),
                json.dumps(s.get("eligible_slots", ["head", "face", "mouth", "armor", "garment", "shoes"])),
                json.dumps(s.get("bonuses", {}), sort_keys=True),
                s.get("description", ""),
                now_iso,
            ),
        )

    for c in snapshot["cards"]:
        conn.execute(
            """
            INSERT INTO cards (
                id, name, slot, tier, slots_json, source_monsters_json,
                removable, max_per_item, is_limited, bonuses_json, mechanics_json,
                description, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                slot = excluded.slot,
                tier = excluded.tier,
                slots_json = excluded.slots_json,
                source_monsters_json = excluded.source_monsters_json,
                removable = excluded.removable,
                max_per_item = excluded.max_per_item,
                is_limited = excluded.is_limited,
                bonuses_json = excluded.bonuses_json,
                mechanics_json = excluded.mechanics_json,
                description = excluded.description,
                updated_at = excluded.updated_at
            """,
            (
                c["id"],
                c["name"],
                c["slot"],
                c.get("tier"),
                json.dumps(c.get("slots", [c["slot"]])),
                json.dumps(c.get("source_monsters", [])),
                1 if c.get("removable", True) else 0,
                int(c.get("max_per_item", 1)),
                1 if c.get("is_limited") else 0,
                json.dumps(c.get("bonuses", {}), sort_keys=True),
                json.dumps(c.get("mechanics", [])),
                c.get("description", ""),
                now_iso,
            ),
        )

    for m in snapshot["monsters"]:
        conn.execute(
            """
            INSERT INTO monsters (
                id, name, level, hp, def, mdef, hit, flee, element, areas_json,
                is_boss, is_monster, description, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                level = excluded.level,
                hp = excluded.hp,
                def = excluded.def,
                mdef = excluded.mdef,
                hit = excluded.hit,
                flee = excluded.flee,
                element = excluded.element,
                areas_json = excluded.areas_json,
                is_boss = excluded.is_boss,
                is_monster = excluded.is_monster,
                description = excluded.description,
                updated_at = excluded.updated_at
            """,
            (
                m["id"],
                m["name"],
                int(m.get("level", 150)),
                int(m.get("hp", 1000)),
                int(m.get("def", 255)),
                int(m.get("mdef", 240)),
                int(m.get("hit", 0)),
                int(m.get("flee", 500)),
                m.get("element", "dark"),
                json.dumps(m.get("areas", [])),
                1 if m.get("is_boss", True) else 0,
                1 if m.get("is_monster", True) else 0,
                m.get("description", ""),
                now_iso,
            ),
        )

    for meta_key in ("card_mechanics", "card_mechanics_params", "equipment_affix_system"):
        if meta_key in snapshot:
            conn.execute(
                """
                INSERT INTO wiki_metadata (key, value_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = excluded.updated_at
                """,
                (meta_key, json.dumps(snapshot[meta_key], sort_keys=True, ensure_ascii=False), now_iso),
            )


def _seed_initial_cdc_history_if_empty(conn: Any) -> int:
    """Seed the 4 historical 2026-11-13 balance patch records if `data_changes` is empty."""
    count = conn.execute("SELECT COUNT(*) AS cnt FROM data_changes").fetchone()["cnt"]
    if count > 0:
        return 0

    inserted = 0
    for chg in SEED_INITIAL_CDC_CHANGES:
        conn.execute(
            """
            INSERT INTO data_changes (
                entity_type, entity_id, entity_name, change_type,
                old_hash, new_hash, diff_summary, diff_json,
                affected_jobs_json, patch_version, detected_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                chg["entity_type"],
                chg["entity_id"],
                chg["entity_name"],
                chg["change_type"],
                chg["old_hash"],
                chg["new_hash"],
                chg["diff_summary"],
                json.dumps(chg["diff"], sort_keys=True),
                json.dumps(chg["affected_jobs"]),
                chg["patch_version"],
                chg["detected_at"],
            ),
        )
        inserted += 1
    return inserted


def run_sync(
    db_path: Optional[Path | str] = None,
    fetch_live: bool = True,
    simulate_patch: bool = False,
) -> Dict[str, Any]:
    """
    Synchronize Wiki/Seed data into SQLite, compute Canonical JSON SHA-256 hashes,
    and log any detected CDC changes into `data_changes`.
    """
    init_db(db_path)
    snapshot = fetch_wiki_snapshot(fetch_live=fetch_live, simulate_patch=simulate_patch)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    patch_version = snapshot.get("meta", {}).get("patch_version", "2026-11-13")

    entity_collections: List[Tuple[str, List[Dict[str, Any]]]] = [
        ("job", snapshot["jobs"]),
        ("skill", snapshot["skills"]),
        ("passive", snapshot["cross_passives"]),
        ("equipment", snapshot["equipment"]),
        ("armor_set", snapshot["armor_sets"]),
        ("card", snapshot["cards"]),
        ("monster", snapshot["monsters"]),
    ]

    detected_changes: List[Dict[str, Any]] = []

    with closing(get_connection(db_path)) as conn:
        existing_rows = conn.execute(
            "SELECT entity_type, entity_id, sha256_hash, snapshot_json FROM entity_hashes"
        ).fetchall()
        existing_map: Dict[Tuple[str, str], Tuple[str, str]] = {
            (r["entity_type"], r["entity_id"]): (r["sha256_hash"], r["snapshot_json"])
            for r in existing_rows
        }
        is_initial_bootstrap = len(existing_map) == 0

        _upsert_domain_tables(conn, snapshot, now_iso)
        seeded_history_count = _seed_initial_cdc_history_if_empty(conn)

        for entity_type, items in entity_collections:
            for item in items:
                entity_id = item["id"]
                entity_name = item.get("name", entity_id)
                snap_str = canonical_json(item)
                new_hash = compute_canonical_hash(item)
                key = (entity_type, entity_id)

                if key not in existing_map:
                    conn.execute(
                        """
                        INSERT INTO entity_hashes (
                            entity_type, entity_id, entity_name, sha256_hash, snapshot_json, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (entity_type, entity_id, entity_name, new_hash, snap_str, now_iso),
                    )
                    if not is_initial_bootstrap:
                        affected = _infer_affected_jobs(entity_type, item)
                        summary = f"[{patch_version}] New {entity_type} added: {entity_name}"
                        conn.execute(
                            """
                            INSERT INTO data_changes (
                                entity_type, entity_id, entity_name, change_type,
                                old_hash, new_hash, diff_summary, diff_json,
                                affected_jobs_json, patch_version, detected_at
                            ) VALUES (?, ?, ?, 'ADDED', NULL, ?, ?, '{}', ?, ?, ?)
                            """,
                            (
                                entity_type,
                                entity_id,
                                entity_name,
                                new_hash,
                                summary,
                                json.dumps(affected),
                                patch_version,
                                now_iso,
                            ),
                        )
                        detected_changes.append(
                            {
                                "entity_type": entity_type,
                                "entity_id": entity_id,
                                "entity_name": entity_name,
                                "change_type": "ADDED",
                                "diff_summary": summary,
                                "patch_version": patch_version,
                            }
                        )
                else:
                    old_hash, old_snap_str = existing_map[key]
                    if old_hash != new_hash:
                        old_obj = json.loads(old_snap_str)
                        diffs, raw_summary = compute_field_diff(old_obj, item)
                        summary = f"[{patch_version}] {raw_summary}"
                        affected = _infer_affected_jobs(entity_type, item)

                        conn.execute(
                            """
                            UPDATE entity_hashes
                            SET entity_name = ?, sha256_hash = ?, snapshot_json = ?, updated_at = ?
                            WHERE entity_type = ? AND entity_id = ?
                            """,
                            (entity_name, new_hash, snap_str, now_iso, entity_type, entity_id),
                        )
                        conn.execute(
                            """
                            INSERT INTO data_changes (
                                entity_type, entity_id, entity_name, change_type,
                                old_hash, new_hash, diff_summary, diff_json,
                                affected_jobs_json, patch_version, detected_at
                            ) VALUES (?, ?, ?, 'MODIFIED', ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                entity_type,
                                entity_id,
                                entity_name,
                                old_hash,
                                new_hash,
                                summary,
                                json.dumps(diffs, sort_keys=True),
                                json.dumps(affected),
                                patch_version,
                                now_iso,
                            ),
                        )
                        detected_changes.append(
                            {
                                "entity_type": entity_type,
                                "entity_id": entity_id,
                                "entity_name": entity_name,
                                "change_type": "MODIFIED",
                                "old_hash": old_hash,
                                "new_hash": new_hash,
                                "diff_summary": summary,
                                "diff": diffs,
                                "patch_version": patch_version,
                            }
                        )
                    else:
                        conn.execute(
                            "UPDATE entity_hashes SET updated_at = ? WHERE entity_type = ? AND entity_id = ?",
                            (now_iso, entity_type, entity_id),
                        )

        conn.commit()

    status = get_cdc_status(db_path)
    return {
        "status": "ok",
        "synced_at": now_iso,
        "is_initial_bootstrap": is_initial_bootstrap,
        "seeded_history_count": seeded_history_count,
        "new_changes_detected": len(detected_changes),
        "detected_changes": detected_changes,
        "scraper_meta": snapshot.get("meta", {}),
        "cdc_status": status,
        "recent_changes": get_cdc_changes(db_path, limit=10),
    }

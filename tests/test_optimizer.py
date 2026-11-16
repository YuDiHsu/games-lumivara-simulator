"""Integration tests for Multi-Job Build Optimizer & FastAPI REST Endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.db.database import get_all_meta
from backend.engine.combat_math import max_stat_cap_for_level, stat_cost, total_stat_points
from backend.engine.job_specs import build_runtime_catalog
from backend.engine.optimizer import optimize_build_api
from backend.main import app

client = TestClient(app)

TEMPLAR_CORE_PASSIVES = [
    "Close-Combat Mastery",
    "Vigor",
    "Iron Body",
    "Zanshin",
    "Fatal Sense",
    "Twin Strike",
    "Weight Training",
    "Light & Shadow",
]


def test_templar_light_coating_vs_uncoated_synergy() -> None:
    """
    Verify Templar Light Weapon Coating synergy against Dark bosses:
    - With `weapon_coating='light'`, Light & Shadow is top-tier and beats uncoated DPS by >30%.
    - Total VIT reaches >= 300 at Lv.150 for 15x GLD multiplier.
    """
    res_light = optimize_build_api(
        {
            "job_id": "templar",
            "level": 150,
            "unlocked_passives": TEMPLAR_CORE_PASSIVES,
            "weapon_coating": "light",
            "target_preset": "tier6_dark_boss",
            "top_k": 3,
        }
    )
    top_light = res_light["top_builds"][0]
    assert top_light["stat_points_used"] <= total_stat_points(150)
    assert all(1 <= v <= 119 for v in top_light["base_stats"].values())
    assert len(top_light["passives"]) == 4
    assert "Light & Shadow" in top_light["passives"]
    assert top_light["total_stats"]["vit"] >= 300
    assert "Armor Breaker" in top_light["armor_sets"]
    assert res_light["coating_comparison"]["light_coating_gain_pct"] > 30.0

    # Compare uncoated vs light-coated on Dark Boss
    res_none_boss = optimize_build_api(
        {
            "job_id": "templar",
            "level": 150,
            "unlocked_passives": TEMPLAR_CORE_PASSIVES,
            "weapon_coating": None,
            "target_preset": "tier6_dark_boss",
            "top_k": 3,
        }
    )
    top_none_boss = res_none_boss["top_builds"][0]
    assert top_light["total_dps"] > top_none_boss["total_dps"] * 1.30

    # On PvP neutral target without coating, Kensei (all neutral coating-inherited skills) skips Light & Shadow,
    # whereas enabling Light coating vs Dark Boss brings Light & Shadow into top 4.
    res_ke_uncoated = optimize_build_api(
        {
            "job_id": "kensei",
            "level": 118,
            "unlocked_passives": TEMPLAR_CORE_PASSIVES,
            "weapon_coating": None,
            "target_preset": "pvp_tank",
            "top_k": 1,
        }
    )
    res_ke_coated_boss = optimize_build_api(
        {
            "job_id": "kensei",
            "level": 118,
            "unlocked_passives": TEMPLAR_CORE_PASSIVES,
            "weapon_coating": "light",
            "target_preset": "tier6_dark_boss",
            "top_k": 1,
        }
    )
    assert "Light & Shadow" not in res_ke_uncoated["top_builds"][0]["passives"]
    assert res_ke_coated_boss["coating_comparison"]["light_coating_gain_pct"] > 35.0


def test_the_king_royal_balance_str_equals_int() -> None:
    """Verify The King activates Royal Balance (`STR == INT`) in its optimal build."""
    res_king = optimize_build_api(
        {
            "job_id": "king",
            "level": 150,
            "unlocked_passives": [
                "Close-Combat Mastery",
                "Weight Training",
                "Mentality",
                "Fair Value",
                "HFT",
                "Light & Shadow",
            ],
            "weapon_coating": "light",
            "target_preset": "tier6_dark_boss",
            "top_k": 2,
        }
    )
    top_king = res_king["top_builds"][0]
    tot_s = top_king["total_stats"]
    assert tot_s["str"] == tot_s["int"] or top_king["base_stats"]["str"] == top_king["base_stats"]["int"]
    assert any("Royal Balance" in t for t in top_king["active_thresholds"])


def test_sinister_does_not_exploit_king_fair_value() -> None:
    """Sinister (Twin Pistols) must not take King-only Fair Value when STR != INT."""
    res_sinister = optimize_build_api(
        job_id="sinister",
        level=120,
        top_n=1,
    )
    top_sin = res_sinister["top_builds"][0]
    assert "Fair Value" not in top_sin["passives"]
    assert "HFT" not in top_sin["passives"]
    assert res_sinister["job"]["weapon_type"] == "pistols"
    assert res_sinister["job"]["is_two_handed"] is True


def test_sqlite_single_source_of_truth_and_sunfire_colossus_card() -> None:
    """Verify runtime catalog reads 102 cards / 11 sets / 56 passives from SQLite `get_all_meta()`."""
    raw_meta = get_all_meta()
    jobs, passives, sets, cards = build_runtime_catalog(raw_meta)
    assert len(jobs) == 15
    assert len(passives) == 56
    assert len(sets) == 11
    assert len(cards) == 102

    colossus = cards["colossus_card"]
    assert colossus.name == "Sunfire Colossus Card"
    assert colossus.tier == "S"
    assert colossus.bonuses["str"] == 8.0
    assert colossus.bonuses["atk_pct"] == 0.03
    assert colossus.bonuses["phys_pierce"] == 0.05


def test_two_handed_vs_one_handed_card_slots_and_gear_affixes() -> None:
    """
    2H weapons unlock 2 weapon card slots (`weapon_1`, `weapon_2`) and block `shield`;
    1H weapons unlock `weapon_1` + `shield`/offhand. `gear_affix_recommendations` covers all 10 slots.
    """
    res_2h = optimize_build_api(job_id="templar", level=120, top_n=1)
    cards_2h = res_2h["card_recommendations"]
    assert cards_2h["two_handed_weapon_slots"] == 2
    assert "weapon_1" in cards_2h["cards_by_slot"]
    assert "weapon_2" in cards_2h["cards_by_slot"]
    assert cards_2h["cards_by_slot"]["shield"] is None

    affixes_2h = res_2h["gear_affix_recommendations"]
    assert len(affixes_2h["slots"]) == 10
    shield_affix = next(s for s in affixes_2h["slots"] if s["slot"] == "shield")
    assert shield_affix["blocked_by_two_handed"] is True
    assert "breakpoints_status" in affixes_2h

    # 1H Kensei (Katana + Saya)
    res_1h = optimize_build_api(job_id="kensei", level=120, top_n=1)
    cards_1h = res_1h["card_recommendations"]
    assert cards_1h["two_handed_weapon_slots"] == 1
    assert "weapon_2" not in cards_1h["cards_by_slot"]
    assert cards_1h["cards_by_slot"]["shield"] is not None
    shield_1h_affix = next(s for s in res_1h["gear_affix_recommendations"]["slots"] if s["slot"] == "shield")
    assert shield_1h_affix["blocked_by_two_handed"] is False
    assert "Saya" in shield_1h_affix["template_name"]


def test_separated_hit_and_aspd_metrics_in_response() -> None:
    """Optimize response exposes separated HIT and ASPD metrics with distinct formula notes."""
    res = optimize_build_api(job_id="kensei", level=120, target_flee=500, top_n=1)
    ps = res["top_builds"][0]["panel_stats"]
    assert "player_hit" in ps and ps["player_hit"] >= 220
    assert "target_flee" in ps and ps["target_flee"] == 500
    assert "hit_chance_pct" in ps and 40.0 <= ps["hit_chance_pct"] <= 100.0
    assert "HIT =" in ps["hit_formula_note"]

    assert "aspd" in ps and 140.0 <= ps["aspd"] <= 193.0
    assert "attacks_per_sec" in ps and ps["attacks_per_sec"] > 1.0
    assert "attack_interval_ms" in ps and ps["attack_interval_ms"] >= 140
    assert "ASPD =" in ps["aspd_formula_note"]


def test_multi_job_invariants_kensei_and_necromancer() -> None:
    """Verify stat budget, cap (99 at Lv.118 vs 119 at Lv.150), and 4 passives across jobs."""
    cases = [
        ("templar", 118, TEMPLAR_CORE_PASSIVES[:6]),
        ("templar", 121, TEMPLAR_CORE_PASSIVES[:6]),
        ("kensei", 150, ["Close-Combat Mastery", "Zanshin", "Fatal Sense", "Twin Strike", "Weight Training", "Light & Shadow"]),
        ("necromancer", 150, ["Mentality", "Alchemy Mastery", "Soul-Lantern Harvest", "Light & Shadow", "Vigor", "Battle Momentum"]),
    ]
    for job_id, lv, p_pool in cases:
        res = optimize_build_api(
            {"job_id": job_id, "level": lv, "unlocked_passives": p_pool, "top_k": 2}
        )
        expected_cap = max_stat_cap_for_level(lv)
        avail = total_stat_points(lv)
        assert res["job"]["max_stat_cap"] == expected_cap

        for b in res["top_builds"]:
            recalc_used = sum(stat_cost(v) for v in b["base_stats"].values())
            assert recalc_used == b["stat_points_used"]
            assert b["stat_points_used"] <= avail
            assert all(1 <= v <= expected_cap for v in b["base_stats"].values())
            assert len(b["passives"]) == 4


def test_fastapi_endpoints_full_lifecycle() -> None:
    """Verify all FastAPI endpoints (/api/health, /api/meta, /api/cdc/*, /api/optimize)."""
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"

    r_meta = client.get("/api/meta")
    assert r_meta.status_code == 200
    meta_data = r_meta.json()
    assert len(meta_data["jobs"]) == 15
    assert len(meta_data["cross_passives"]) == 56
    assert len(meta_data["armor_sets"]) == 11
    assert len(meta_data["cards"]) == 102
    assert len(meta_data["monsters"]) == 101
    assert meta_data["stat_points_table"]["118"]["total_stat_points"] == 1708
    assert meta_data["stat_points_table"]["121"]["total_stat_points"] == 1788
    assert meta_data["stat_points_table"]["150"]["total_stat_points"] == 2652
    assert "formula_notes" in meta_data

    r_status = client.get("/api/cdc/status")
    assert r_status.status_code == 200
    assert r_status.json()["tracked_entities"] >= 450

    r_changes = client.get("/api/cdc/changes?job_id=templar")
    assert r_changes.status_code == 200
    assert len(r_changes.json()["changes"]) >= 1

    r_opt = client.post(
        "/api/optimize",
        json={
            "job_id": "templar",
            "level": 150,
            "unlocked_passives": TEMPLAR_CORE_PASSIVES[:6],
            "weapon_coating": "light",
            "target_preset": "tier6_dark_boss",
            "top_k": 3,
        },
    )
    assert r_opt.status_code == 200
    opt_data = r_opt.json()
    assert opt_data["job"]["job_id"] == "templar"
    assert len(opt_data["top_builds"]) == 3
    assert "cdc_alerts" in opt_data
    assert len(opt_data["card_recommendations"]["recommendations"]) == 10
    assert len(opt_data["gear_affix_recommendations"]["slots"]) == 10

    # Frontend payload compatibility (`the_king` alias + nested `gear` and `target`)
    r_opt_fe = client.post(
        "/api/optimize",
        json={
            "job_id": "the_king",
            "level": 150,
            "unlocked_passives": [
                "Close-Combat Mastery",
                "Weight Training",
                "Mentality",
                "Fair Value",
                "HFT",
                "Light & Shadow",
            ],
            "gear": {
                "weapon_refine": 10,
                "is_two_handed": True,
                "weapon_coating": "light",
                "phys_pierce": 0.30,
                "magic_pierce": 0.30,
                "str": 60,
                "int": 60,
            },
            "target": {
                "preset_id": "dark_boss_255",
                "name": "Dark Boss",
                "target_def": 255,
                "target_mdef": 240,
                "target_flee": 500,
                "element": "dark",
                "is_monster": True,
            },
        },
    )
    assert r_opt_fe.status_code == 200
    assert r_opt_fe.json()["job"]["job_id"] == "king"

    r_sync = client.post("/api/cdc/sync", json={"fetch_live": False, "simulate_patch": False})
    assert r_sync.status_code == 200
    assert r_sync.json()["status"]["backend_online"] is True


def test_dps_only_gear_affixes_vit_vs_flat_hp_and_set_assignments() -> None:
    """
    Verify Phase 2 gear_affix_recommendations invariants:
    - Non-DPS affixes (resStun/resFreeze/resBleed/hpRegen/spRegen/moveSpeed/hp) are strictly excluded.
    - vit_vs_flat_hp_comparison proves +12 VIT beats +180 Flat HP in both HP and DPS.
    - stat_priority_guide orders all 6 stats by marginal +12 DPS.
    - All 6 armor slots receive set_assignment and per-slot cards.
    """
    raw_meta = get_all_meta()
    res = optimize_build_api(
        job_id="templar",
        level=150,
        weapon_coating="light",
        target_preset="tier6_dark_boss",
        top_n=1,
        db_meta=raw_meta,
    )
    gar = res["gear_affix_recommendations"]
    assert "vit_vs_flat_hp_comparison" in gar
    cmp_v = gar["vit_vs_flat_hp_comparison"]
    assert cmp_v["vit_hp_gain"] > cmp_v["flat_hp_gain"]
    assert cmp_v["vit_12_dps_gain"] > cmp_v["flat_hp_180_dps_gain"]

    guide = gar["stat_priority_guide"]
    assert len(guide) == 6
    assert guide[0]["marginal_dps_per_12"] >= guide[-1]["marginal_dps_per_12"]

    banned_keys = {"resStun", "resFreeze", "resBleed", "hpRegen", "spRegen", "moveSpeed", "hp"}
    banned_words = ("Steadfast", "Thawing", "Ironhide", "Serene", "Vital", "Spin", "Blood")
    armor_slots_seen = []
    for sl in gar["slots"]:
        assert sl.get("affix_key") not in banned_keys
        spec = sl.get("recommended_special_affix") or ""
        assert not any(w in spec for w in banned_words)
        for ru in sl.get("runner_up_affixes", []):
            assert not any(w in ru for w in banned_words)
        if sl["slot"] in ("head", "face", "mouth", "armor", "garment", "shoes"):
            armor_slots_seen.append(sl["slot"])
            assert sl["set_assignment"] is not None
            assert sl["recommended_special_affix"] is None

    assert len(armor_slots_seen) == 6
    weapon_slot = next(s for s in gar["slots"] if s["slot"] == "weapon")
    assert weapon_slot["affix_key"] in ("pierce", "atkPct", "critDmg")
    assert len(weapon_slot["cards"]) == 2


def test_card_mechanics_titan_and_swarm_in_evaluate_dps() -> None:
    """Verify mTitan (+25% Boss vs -10% normal mob) and mSwarm (+20% ASPD, +10% dmg at cap) in evaluate_dps."""
    from backend.engine.job_specs import get_default_gear_for_job
    from backend.engine.models import TargetProfile
    from backend.engine.optimizer import evaluate_dps

    raw_meta = get_all_meta()
    jobs, passives, sets, cards = build_runtime_catalog(raw_meta)
    kensei = jobs["kensei"]
    gear = get_default_gear_for_job("kensei", affix_budget="high", weapon_coating="light", refine_level=10)
    gear.level = 150
    stats = {"str": 119, "agi": 100, "vit": 20, "int": 1, "dex": 70, "luk": 60}
    p_comb = ("Close-Combat Mastery", "Fatal Sense", "Zanshin", "Twin Strike")
    s_comb = ("Warlord", "Warlord", "Warlord")

    boss_tgt = TargetProfile(name="Dark Boss (MvP)", level=150, target_def=200, target_mdef=150, target_flee=350, element="dark", is_monster=True)
    mob_tgt = TargetProfile(name="Slime Mob", level=80, target_def=50, target_mdef=50, target_flee=150, element="neutral", is_monster=True)

    titan_card = cards["titan_card"]
    swarm_card = cards["hornet_card"]
    assert "mTitan" in titan_card.mechanics
    assert "mSwarm" in swarm_card.mechanics

    base_boss = evaluate_dps(stats, p_comb, s_comb, kensei, gear, boss_tgt, cards_loadout=[], passives_catalog=passives, sets_catalog=sets)
    titan_boss = evaluate_dps(stats, p_comb, s_comb, kensei, gear, boss_tgt, cards_loadout=[titan_card], passives_catalog=passives, sets_catalog=sets)
    assert titan_boss["total_dps"] == pytest.approx(base_boss["total_dps"] * 1.25, rel=1e-3)

    base_mob = evaluate_dps(stats, p_comb, s_comb, kensei, gear, mob_tgt, cards_loadout=[], passives_catalog=passives, sets_catalog=sets)
    titan_mob = evaluate_dps(stats, p_comb, s_comb, kensei, gear, mob_tgt, cards_loadout=[titan_card], passives_catalog=passives, sets_catalog=sets)
    assert titan_mob["total_dps"] == pytest.approx(base_mob["total_dps"] * 0.90, rel=1e-3)

    swarm_boss = evaluate_dps(stats, p_comb, s_comb, kensei, gear, boss_tgt, cards_loadout=[swarm_card], passives_catalog=passives, sets_catalog=sets)
    assert swarm_boss["aspd"] >= base_boss["aspd"]
    assert swarm_boss["total_dps"] > base_boss["total_dps"]


def test_unlocked_passives_id_resolution_templar_scale_and_innate_separation() -> None:
    """
    Verify:
    - Passing passive IDs (e.g. 'swordmastery', 'lightshadow') resolves to full 4/4 passives.
    - Own-job innate passives ('Sacred Guillotine Chain', 'Colossus Radiant Bash') appear in
      `innate_class_passives` and never occupy the 4/4 cross-class slots.
    - Templar innate auto scaling matches Wiki (3.1505x ATK + 0.021 MaxHP).
    """
    raw_meta = get_all_meta()
    jobs, _, _, _ = build_runtime_catalog(raw_meta)
    assert jobs["templar"].auto_atk_scale == pytest.approx(3.1505, rel=1e-4)
    assert jobs["templar"].auto_hp_scale == pytest.approx(0.021, rel=1e-4)

    res = optimize_build_api(
        job_id="templar",
        level=150,
        unlocked_passives=[
            "swordmastery",
            "fatalsense",
            "doubleattack",
            "weighttraining",
            "lightshadow",
            "sacredguillotine",
            "colossusbash",
        ],
        card_tier_filter="standard_only",
        top_n=1,
        db_meta=raw_meta,
    )
    top = res["top_builds"][0]
    assert len(top["passives"]) == 4
    assert "Sacred Guillotine Chain" not in top["passives"]
    assert "Colossus Radiant Bash" not in top["passives"]
    assert "Sacred Guillotine Chain" in top["innate_class_passives"]
    assert "Colossus Radiant Bash" in top["innate_class_passives"]
    assert len(res.get("armor_set_alternatives", [])) >= 2
    # Farmable standard_only card pool still fills head/accessory slots cleanly
    cbs = res["card_recommendations"]["cards_by_slot"]
    assert cbs["head_upper"] is not None
    assert cbs["accessory_1"] is not None


def test_necromancer_three_black_cats_int300_and_pure_caster_accessories() -> None:
    """
    Verify Wicked Necromancer hits Total INT >= 300, models all 3 Black Cat summons in dps_breakdown,
    and never recommends Physical Pierce or ATK% on Accessory 1 for pure magic classes.
    """
    raw_meta = get_all_meta()
    res = optimize_build_api(
        job_id="necromancer",
        level=150,
        card_tier_filter="standard_only",
        target_preset="tier6_dark_boss",
        top_n=1,
        db_meta=raw_meta,
    )
    top = res["top_builds"][0]
    assert top["total_stats"]["int"] >= 300
    bd = top["dps_breakdown"]
    assert bd.get("Black Cat Knight", 0.0) > 0.0
    assert bd.get("Black Cat Archer", 0.0) > 0.0
    assert bd.get("Black Cat Cleric", 0.0) > 0.0

    slots = {s["slot"]: s for s in res["gear_affix_recommendations"]["slots"]}
    assert slots["accessory1"]["affix_key"] in ("mpierce", "matkPct", "critDmg")
    assert slots["accessory2"]["affix_key"] in ("mpierce", "matkPct", "critDmg")


def test_zero_thai_and_zero_ai_meta_text_and_all_15_jobs_smoke() -> None:
    """Ensure /api/meta and /api/optimize emit zero Thai chars / AI meta copy and all 15 jobs evaluate cleanly."""
    import json
    import re

    from backend.engine.job_specs import get_default_gear_for_job
    from backend.engine.models import TargetProfile
    from backend.engine.optimizer import evaluate_dps

    thai_re = re.compile(r"[\u0E00-\u0E7F]")
    ai_phrases = ("Never pick flat HP", "實戰 +12 VIT 勝過", "已嚴格過濾", "不納入 DPS 詞綴推薦")

    r_meta = client.get("/api/meta")
    assert r_meta.status_code == 200
    meta_txt = json.dumps(r_meta.json(), ensure_ascii=False)
    assert not thai_re.search(meta_txt)

    r_opt = client.post("/api/optimize", json={"job_id": "templar", "level": 150, "top_n": 1})
    assert r_opt.status_code == 200
    opt_txt = json.dumps(r_opt.json(), ensure_ascii=False)
    assert not thai_re.search(opt_txt)
    for phrase in ai_phrases:
        assert phrase not in opt_txt

    raw_meta = get_all_meta()
    jobs, passives, sets, _ = build_runtime_catalog(raw_meta)
    assert len(jobs) == 15
    tgt = TargetProfile(name="Boss Dummy", level=150, target_def=200, target_mdef=200, target_flee=300, element="dark", is_monster=True)
    base_stats = {"str": 90, "agi": 70, "vit": 60, "int": 90, "dex": 80, "luk": 50}
    for jid, cls in jobs.items():
        g = get_default_gear_for_job(jid)
        ev = evaluate_dps(base_stats, (), ("Warlord", "Warlord", "Warlord"), cls, g, tgt, passives_catalog=passives, sets_catalog=sets)
        assert ev["total_dps"] > 0.0, f"{jid} produced zero DPS"


def test_dual_same_archetype_rings_and_king_body_hp_vit() -> None:
    """Physical jobs can equip dual Physical Rings (Piercing x2 when headroom allows), and King uses pre-multiplier body_hp for Vigor."""
    from backend.db.database import get_all_meta
    from backend.engine.optimizer import optimize_build_api

    raw_meta = get_all_meta()

    # Physical job (Templar) with default phys_pierce headroom > 12% should use physical ring pool in both slots
    res_templar = optimize_build_api(
        job_id="templar",
        level=150,
        card_tier_filter="standard_only",
        target_preset="tier6_dark_boss",
        top_n=1,
        db_meta=raw_meta,
    )
    t_slots = {s["slot"]: s for s in res_templar["gear_affix_recommendations"]["slots"]}
    assert t_slots["accessory1"]["affix_key"] in ("pierce", "atkPct", "critDmg")
    assert t_slots["accessory2"]["affix_key"] in ("pierce", "atkPct", "critDmg")
    for s in res_templar["gear_affix_recommendations"]["slots"]:
        if not s["blocked_by_two_handed"]:
            assert len(s["primary_stat_targets"]) == 2
            assert len(s["recommended_substats"]) == 2
            assert "HIT/CRIT" not in (s.get("special_affix_target") or "")
    assert t_slots["armor"].get("fallback_stat_target")
    assert any(("Obsidian" in txt or "Platinum" in txt) for txt in t_slots["accessory1"].get("independent_roll_targets", []))

    # Hybrid job (The King) must not dump points into VIT once body_hp is used instead of inflated max_hp
    res_king = optimize_build_api(
        job_id="king",
        level=150,
        card_tier_filter="standard_only",
        target_preset="tier6_dark_boss",
        top_n=1,
        db_meta=raw_meta,
    )
    k_top = res_king["top_builds"][0]
    assert k_top["base_stats"]["str"] == k_top["base_stats"]["int"]
    assert k_top["base_stats"]["vit"] <= 30, f"Unexpected VIT dump for The King: {k_top['base_stats']}"
    k_slots = {s["slot"]: s for s in res_king["gear_affix_recommendations"]["slots"]}
    assert k_slots["accessory1"]["affix_key"] in ("pierce", "atkPct", "critDmg")
    assert k_slots["accessory2"]["affix_key"] in ("mpierce", "matkPct", "critDmg")


def test_clean_slate_exact_slot_sum_and_evaluate_api() -> None:
    """
    Verify clean-slate optimization packs gear stats identically across the 9 active slots,
    stat_sources sums identically to total_stats, and POST /api/evaluate evaluates interactive changes.
    """
    raw_meta = get_all_meta()
    r_opt = client.post(
        "/api/optimize",
        json={
            "job_id": "templar",
            "level": 150,
            "auto_gear_stats": True,
            "weapon_coating": "light",
            "target_preset": "tier6_dark_boss",
            "top_k": 2,
        },
    )
    assert r_opt.status_code == 200
    opt_data = r_opt.json()
    top = opt_data["top_builds"][0]

    # Sum of allocated_stats across all 10 equipment slots must match gear_stats identically
    slot_sum: Dict[str, int] = {k: 0 for k in ("str", "agi", "vit", "int", "dex", "luk")}
    for sl in top["gear_affix_recommendations"]["slots"]:
        alloc = sl.get("allocated_stats") or {}
        if not sl["blocked_by_two_handed"]:
            assert len(alloc) <= 2
        for k, v in alloc.items():
            slot_sum[k] += int(v)
    assert slot_sum == top["gear_stats"]

    # stat_sources must reconcile to total_stats to the exact integer
    ss = top["stat_sources"]
    for k in ("str", "agi", "vit", "int", "dex", "luk"):
        reconciled = (
            ss["base"][k] + ss["job"][k] + ss["innate"][k]
            + ss["gear"][k] + ss["cards"][k] + ss["sets"][k] + ss["passives"][k]
        )
        assert reconciled == top["total_stats"][k]

    # Simulator /api/evaluate with identical build matches total_dps, and lowering gear VIT reduces DPS
    cards_map = {
        k: (v["card_id"] if v else None)
        for k, v in top["card_recommendations"]["cards_by_slot"].items()
    }
    r_same = client.post(
        "/api/evaluate",
        json={
            "job_id": "templar",
            "level": 150,
            "base_stats": top["base_stats"],
            "gear_stats": top["gear_stats"],
            "gear_mods": top["gear_mods"],
            "passives": top["passives"],
            "armor_sets": top["armor_sets"],
            "cards_by_slot": cards_map,
            "target_preset": "tier6_dark_boss",
        },
    )
    assert r_same.status_code == 200
    assert abs(r_same.json()["total_dps"] - top["total_dps"]) < 1.0

    lower_gear = dict(top["gear_stats"])
    lower_gear["vit"] = max(0, lower_gear["vit"] - 60)
    r_lower = client.post(
        "/api/evaluate",
        json={
            "job_id": "templar",
            "level": 150,
            "base_stats": top["base_stats"],
            "gear_stats": lower_gear,
            "gear_mods": top["gear_mods"],
            "passives": top["passives"],
            "armor_sets": top["armor_sets"],
            "cards_by_slot": cards_map,
            "target_preset": "tier6_dark_boss",
        },
    )
    assert r_lower.status_code == 200
    assert r_lower.json()["total_dps"] < top["total_dps"]


def test_templar_procs_disabled_skills_and_solo_party_mechanics() -> None:
    """
    Verify:
    1. Default weapon_coating is None (unenchanted), while coating_comparison reports Light enchant gain vs Eclipse.
    2. Templar dps_breakdown explicitly separates Basic Auto-Attack, Sacred Guillotine Chain, and Colossus Radiant Bash.
    3. /api/evaluate supports `disabled_skills` toggling Templar procs & skills live.
    4. Solo Templar does NOT get false Void Skitter (mWeakSpot) or Karasu Tengu (mOpener) Boss gains, whereas Party Templar can use Void Skitter.
    """
    r_solo = client.post(
        "/api/optimize",
        json={"job_id": "templar", "level": 150, "target_preset": "tier6_dark_boss", "top_n": 1},
    )
    assert r_solo.status_code == 200
    d_solo = r_solo.json()
    assert d_solo["config"]["weapon_coating"] is None
    assert d_solo["coating_comparison"]["light_coating_gain_pct"] > 20.0

    top_solo = d_solo["top_builds"][0]
    bd = top_solo["dps_breakdown"]
    assert "Basic Auto-Attack" in bd
    assert bd.get("Sacred Guillotine Chain", 0) > 0
    assert bd.get("Colossus Radiant Bash", 0) > 0

    # Solo Templar vs Boss has no status ailment kit -> Garment must NOT pick Void Skitter Card
    solo_garment = top_solo["card_recommendations"]["cards_by_slot"]["garment"]
    assert solo_garment is not None and solo_garment["card_id"] != "skitter_card"

    # Disabling Sacred Guillotine Chain & Colossus Radiant Bash drops DPS cleanly
    cards_map = {
        k: (v["card_id"] if v else None)
        for k, v in top_solo["card_recommendations"]["cards_by_slot"].items()
    }
    r_disabled = client.post(
        "/api/evaluate",
        json={
            "job_id": "templar",
            "level": 150,
            "base_stats": top_solo["base_stats"],
            "gear_stats": top_solo["gear_stats"],
            "gear_mods": top_solo["gear_mods"],
            "passives": top_solo["passives"],
            "armor_sets": top_solo["armor_sets"],
            "cards_by_slot": cards_map,
            "disabled_skills": ["sacredguillotine", "colossusbash"],
            "target_preset": "tier6_dark_boss",
        },
    )
    assert r_disabled.status_code == 200
    d_dis = r_disabled.json()
    assert "Sacred Guillotine Chain" not in d_dis["dps_breakdown"]
    assert "Colossus Radiant Bash" not in d_dis["dps_breakdown"]
    assert d_dis["total_dps"] < top_solo["total_dps"]
    assert d_dis["coating_comparison"]["light_coating_gain_pct"] > 20.0

    # Party mode enables teammates' debuffs -> Void Skitter (mWeakSpot) activates for Templar
    r_party = client.post(
        "/api/optimize",
        json={
            "job_id": "templar",
            "level": 150,
            "target_preset": "tier6_dark_boss",
            "custom_target": {"is_party": True},
            "top_n": 1,
        },
    )
    assert r_party.status_code == 200
    d_party = r_party.json()
    assert d_party["top_builds"][0]["card_recommendations"]["cards_by_slot"]["garment"]["card_id"] == "skitter_card"

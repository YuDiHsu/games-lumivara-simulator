"""Metadata API Routes (/api/meta)."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from backend.db.database import get_all_meta
from backend.engine.combat_math import max_stat_cap_for_level, stat_cost, total_stat_points
from backend.engine.job_specs import JOB_REGISTRY, MONSTER_PRESETS

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta")
def get_metadata() -> Dict[str, Any]:
    """
    Return full game metadata from SQLite (all 15 jobs, skills, cross-class passives,
    equipment, armor sets, monster cards, and target monsters) along with
    monster presets, Wiki affix rules summary, and verified stat point/cost tables.
    """
    raw = get_all_meta()

    enriched_jobs = []
    for job in raw.get("jobs", []):
        item = dict(job)
        jid = item.get("id", "").lower()
        reg_profile = JOB_REGISTRY.get(jid)
        item["job_skills"] = item.pop("skills", [])
        if reg_profile:
            item["role"] = reg_profile.role
            item["role_summary"] = item.get("role_summary") or reg_profile.role
            item["weapon_type"] = reg_profile.weapon_type
            item["weapon_name"] = reg_profile.weapon_name
            item["offhand_type"] = reg_profile.offhand_type
            item["is_two_handed"] = reg_profile.is_two_handed
            item["primary_dmg_type"] = reg_profile.primary_dmg_type
            item["base_aspd"] = reg_profile.base_aspd
            item["innate_passive_name"] = reg_profile.innate_passive_name
            item["innate_passive_desc"] = reg_profile.innate_passive_desc
            item["innate_class_passives"] = list(reg_profile.innate_class_passives)
        enriched_jobs.append(item)

    milestone_levels = [1, 10, 50, 99, 118, 119, 121, 130, 140, 150]
    stat_points_table = {
        str(lv): {
            "level": lv,
            "total_stat_points": total_stat_points(lv),
            "max_stat_cap": max_stat_cap_for_level(lv),
        }
        for lv in milestone_levels
    }

    stat_cost_checkpoints = {
        str(val): stat_cost(val) for val in [1, 50, 81, 91, 99, 101, 111, 119]
    }

    monster_presets = {
        k: {
            "preset_id": v.preset_id or k,
            "name": v.name,
            "level": v.level,
            "target_def": v.target_def,
            "target_mdef": v.target_mdef,
            "target_flee": v.target_flee,
            "phys_def": v.target_def,
            "magic_def": v.target_mdef,
            "flee": v.target_flee,
            "element": v.element,
            "is_monster": v.is_monster,
            "is_pvp": v.is_pvp,
        }
        for k, v in MONSTER_PRESETS.items()
    }

    return {
        "jobs": enriched_jobs,
        "skills": raw.get("skills", []),
        "cross_passives": raw.get("cross_passives", []),
        "equipment": raw.get("equipment", []),
        "armor_sets": raw.get("armor_sets", []),
        "cards": raw.get("cards", []),
        "monsters": raw.get("monsters", []),
        "card_mechanics": raw.get("card_mechanics", {}),
        "card_mechanics_params": raw.get("card_mechanics_params", {}),
        "equipment_affix_system": raw.get("equipment_affix_system", {}),
        "monster_presets": monster_presets,
        "stat_points_table": stat_points_table,
        "stat_cost_checkpoints": stat_cost_checkpoints,
        "elements": ["neutral", "light", "dark", "fire", "water", "wind", "earth"],
        "formula_notes": {
            "hit_formula": "floor((100 + Lv + DEX*2 + floor(LUK/3) + Gear/Card/Passive HIT) * (1 + Hit%))",
            "hit_chance": "clamp(1.0 + (HIT - FLEE) * 0.0025, 0.40, 1.00)",
            "aspd_formula": "min(193, softcap180((BaseASPD + WeaponOffset - (8 if Shield else 0) + (AGI*0.3 + DEX*0.02)*(1 - (Base-144)/50)) + ASPD% + Gear/Potion + max(CardASPD)))",
            "aspd_attack_interval": "round((200 - ASPD) * 20) ms",
            "crit_multiplier": "2.0 * (1 + CritDamageBonus%)",
            "two_handed_rules": "2x base stats, 2x refine ATK/MATK, 2x refine Pierce (+10% at +10), 2 card slots, blocks shield slot",
        },
    }

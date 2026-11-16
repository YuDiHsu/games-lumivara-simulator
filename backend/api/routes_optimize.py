"""Build & DPS Optimization API Route (/api/optimize)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from backend.api.routes_cdc import FRONTEND_JOB_ALIASES, enrich_cdc_change
from backend.db.database import get_all_meta, get_cdc_changes
from backend.engine.optimizer import evaluate_build_api, optimize_build_api

router = APIRouter(prefix="/api", tags=["optimize"])


class OptimizePayload(BaseModel):
    """Flexible optimization request payload accepting both backend and frontend schemas."""

    model_config = ConfigDict(extra="allow")

    job_id: str = "templar"
    level: int = 120
    unlocked_passives: Optional[List[str]] = None
    weapon_coating: Optional[str] = None
    refine_level: Optional[int] = None
    is_two_handed: Optional[bool] = None
    affix_budget: str = "high"
    auto_gear_stats: Optional[bool] = None
    custom_gear: Optional[Dict[str, Any]] = None
    target_preset: str = "Boss Dummy (MvP)"
    custom_target: Optional[Dict[str, Any]] = None
    top_k: Optional[int] = None
    top_n: Optional[int] = None

    # Frontend nested objects (optional)
    gear: Optional[Dict[str, Any]] = None
    target: Optional[Dict[str, Any]] = None
    card_budget_mode: Optional[str] = None
    card_tier_filter: Optional[str] = None


class EvaluatePayload(BaseModel):
    """Simulator live evaluation payload for slider & card adjustments."""

    model_config = ConfigDict(extra="allow")

    job_id: str = "templar"
    level: int = 150
    base_stats: Dict[str, int]
    gear_stats: Optional[Dict[str, int]] = None
    gear_mods: Optional[Dict[str, Any]] = None
    passives: Optional[List[str]] = None
    armor_sets: Optional[List[str]] = None
    cards_by_slot: Optional[Dict[str, Optional[str]]] = None
    disabled_skills: Optional[List[str]] = None
    target_preset: str = "tier6_dark_boss"
    target: Optional[Dict[str, Any]] = None
    custom_target: Optional[Dict[str, Any]] = None


def _build_engine_db_meta(raw_meta: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert SQLite `get_all_meta()` tables into the runtime structure consumed by
    `build_runtime_catalog(db_meta)` so SQLite is the single source of truth for
    jobs, skills, cross-class passives, armor sets, cards, and monsters.
    """
    return {
        "jobs": raw_meta.get("jobs", []),
        "skills": raw_meta.get("skills", []),
        "cross_passives": raw_meta.get("cross_passives", []),
        "armor_sets": raw_meta.get("armor_sets", []),
        "cards": raw_meta.get("cards", []),
        "monsters": raw_meta.get("monsters", []),
        "card_mechanics": raw_meta.get("card_mechanics", {}),
        "card_mechanics_params": raw_meta.get("card_mechanics_params", {}),
        "equipment_affix_system": raw_meta.get("equipment_affix_system", {}),
    }


def _normalize_optimize_params(payload: OptimizePayload) -> Dict[str, Any]:
    """Normalize incoming request parameters from either backend or frontend format."""
    data = payload.model_dump()
    raw_job = str(data.get("job_id") or "templar").strip().lower()
    resolved_job = FRONTEND_JOB_ALIASES.get(raw_job, raw_job)

    card_filter = data.get("card_tier_filter")
    if not card_filter:
        mode = str(data.get("card_budget_mode") or "all").lower()
        if mode in ("budget", "standard", "standard_only"):
            card_filter = "standard_only"
        elif mode in ("limited_only",):
            card_filter = "limited_only"
        else:
            card_filter = "all"

    params: Dict[str, Any] = {
        "job_id": resolved_job,
        "level": int(data.get("level") or 120),
        "unlocked_passives": data.get("unlocked_passives"),
        "affix_budget": data.get("affix_budget") or "high",
        "auto_gear_stats": data.get("auto_gear_stats"),
        "target_preset": data.get("target_preset") or "Boss Dummy (MvP)",
        "top_n": int(data.get("top_n") or data.get("top_k") or 5),
        "card_tier_filter": card_filter,
    }

    # Resolve gear parameters (supporting both flat fields and nested `gear` object)
    fe_gear = data.get("gear")
    if isinstance(fe_gear, dict):
        params["weapon_coating"] = fe_gear.get("weapon_coating", data.get("weapon_coating", None))
        raw_ref = fe_gear.get("weapon_refine", fe_gear.get("refine_level", data.get("refine_level")))
        params["refine_level"] = int(raw_ref if raw_ref is not None else 4)
        params["is_two_handed"] = fe_gear.get("is_two_handed", data.get("is_two_handed"))
        if not data.get("custom_gear"):
            mapped_gear: Dict[str, Any] = {}
            bonus_stats: Dict[str, int] = {}
            for gk, gv in fe_gear.items():
                if gk in ("str", "agi", "vit", "int", "dex", "luk") and isinstance(gv, (int, float)):
                    bonus_stats[gk] = int(gv)
                elif gk == "weapon_refine":
                    mapped_gear["refine_level"] = int(gv)
                elif gk == "crit":
                    mapped_gear["crit_rate"] = float(gv)
                elif gk == "mcrit":
                    mapped_gear["mcrit_rate"] = float(gv)
                else:
                    mapped_gear[gk] = gv
            if any(v > 0 for v in bonus_stats.values()):
                mapped_gear["bonus_stats"] = bonus_stats
            elif params["auto_gear_stats"] is None:
                params["auto_gear_stats"] = True
            params["custom_gear"] = mapped_gear
        else:
            params["custom_gear"] = data["custom_gear"]
    else:
        params["weapon_coating"] = data.get("weapon_coating", None)
        params["refine_level"] = int(data.get("refine_level") if data.get("refine_level") is not None else 4)
        params["is_two_handed"] = data.get("is_two_handed")
        params["custom_gear"] = data.get("custom_gear")

    # Resolve target overrides (`custom_target` or nested `target` object)
    tgt_override = data.get("custom_target") or (data.get("target") if isinstance(data.get("target"), dict) else None)
    _apply_target_override(params, tgt_override)
    return params


def _apply_target_override(params: Dict[str, Any], tgt_override: Optional[Dict[str, Any]]) -> None:
    """Apply `target` / `custom_target` overrides onto normalized engine kwargs."""
    if not isinstance(tgt_override, dict):
        return
    if tgt_override.get("preset_id") or tgt_override.get("id"):
        params["target_preset"] = str(tgt_override.get("preset_id") or tgt_override.get("id"))
    if "target_def" in tgt_override or "phys_def" in tgt_override or "def" in tgt_override:
        params["target_def"] = int(tgt_override.get("target_def", tgt_override.get("phys_def", tgt_override.get("def", 120))))
    if "target_mdef" in tgt_override or "magic_def" in tgt_override or "mdef" in tgt_override:
        params["target_mdef"] = int(tgt_override.get("target_mdef", tgt_override.get("magic_def", tgt_override.get("mdef", 120))))
    if "target_flee" in tgt_override or "flee" in tgt_override:
        params["target_flee"] = int(tgt_override.get("target_flee", tgt_override.get("flee", 300)))
    if tgt_override.get("element"):
        params["target_element"] = str(tgt_override["element"]).lower()
    if "is_pvp" in tgt_override:
        params["is_pvp"] = bool(tgt_override["is_pvp"])
    elif "is_monster" in tgt_override:
        params["is_pvp"] = not bool(tgt_override["is_monster"])
    if "is_party" in tgt_override:
        params["is_party"] = bool(tgt_override["is_party"])


@router.post("/optimize")
def run_optimization(payload: OptimizePayload) -> Dict[str, Any]:
    """
    Execute multi-stage build optimization (stat points, 4/4 cross-class passives,
    armor sets, 10-slot cards, and per-slot Wiki gear affix recommendations) and
    attach relevant CDC alerts.
    """
    params = _normalize_optimize_params(payload)
    raw_meta = get_all_meta()
    engine_db_meta = _build_engine_db_meta(raw_meta)

    result = optimize_build_api(db_meta=engine_db_meta, **params)

    resolved_job = result["job"]["job_id"]
    job_changes = [
        enrich_cdc_change(c) for c in get_cdc_changes(job_id=resolved_job, limit=25)
    ]

    top_passives = set()
    top_sets = set()
    if result.get("top_builds"):
        top_b = result["top_builds"][0]
        top_passives = set(top_b.get("passives", []))
        top_sets = set(top_b.get("armor_sets", []))

    cdc_alerts = [
        chg
        for chg in job_changes
        if resolved_job in chg.get("affected_jobs", [])
        or "all" in chg.get("affected_jobs", [])
        or chg.get("entity_name") in top_passives
        or chg.get("entity_name") in top_sets
    ]

    result["cdc_alerts"] = cdc_alerts
    result["computed_by"] = "backend_api"
    return result


@router.post("/evaluate")
def run_evaluation(payload: EvaluatePayload) -> Dict[str, Any]:
    """
    Fast single-build evaluation for interactive Simulator sliders & card swaps.
    """
    data = payload.model_dump()
    raw_job = str(data.get("job_id") or "templar").strip().lower()
    resolved_job = FRONTEND_JOB_ALIASES.get(raw_job, raw_job)

    eval_params: Dict[str, Any] = {
        "job_id": resolved_job,
        "level": int(data.get("level") or 150),
        "base_stats": data.get("base_stats") or {},
        "gear_stats": data.get("gear_stats"),
        "gear_mods": data.get("gear_mods"),
        "passives": data.get("passives") or [],
        "armor_sets": data.get("armor_sets") or [],
        "cards_by_slot": data.get("cards_by_slot") or {},
        "disabled_skills": data.get("disabled_skills") or [],
        "target_preset": data.get("target_preset") or "tier6_dark_boss",
    }
    tgt_override = data.get("custom_target") or (data.get("target") if isinstance(data.get("target"), dict) else None)
    _apply_target_override(eval_params, tgt_override)

    raw_meta = get_all_meta()
    engine_db_meta = _build_engine_db_meta(raw_meta)
    result = evaluate_build_api(db_meta=engine_db_meta, **eval_params)
    result["computed_by"] = "backend_api"
    return result

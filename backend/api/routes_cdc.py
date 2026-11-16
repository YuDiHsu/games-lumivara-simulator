"""CDC (Change Data Capture) API Routes (/api/cdc/*)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, ConfigDict

from backend.db.database import get_cdc_changes, get_cdc_status
from backend.scraper.cdc_engine import run_sync

router = APIRouter(prefix="/api/cdc", tags=["cdc"])

FRONTEND_JOB_ALIASES: Dict[str, str] = {
    "the_king": "king",
    "wicked_necromancer": "necromancer",
    "swordsman": "swordman",
    "asura_monk": "ironfist",
    "shinobi": "mamushi",
    "shadow_assassin": "sinister",
    "wind_ranger": "archer",
    "archmage": "mage",
    "high_priest": "acolyte",
    "alchemist_creator": "merchant",
    "paladin": "templar",
    "beastmaster": "nekobaku",
}

ALL_KNOWN_JOB_IDS: List[str] = [
    "all",
    "templar",
    "kensei",
    "king",
    "the_king",
    "necromancer",
    "wicked_necromancer",
    "mamushi",
    "shinobi",
    "nekobaku",
    "beastmaster",
    "ironfist",
    "asura_monk",
    "sinister",
    "shadow_assassin",
    "swordman",
    "swordsman",
    "mage",
    "archmage",
    "archer",
    "wind_ranger",
    "acolyte",
    "high_priest",
    "merchant",
    "alchemist_creator",
    "thief",
    "novice",
]


class SyncPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    fetch_live: Optional[bool] = None
    simulate_patch: Optional[bool] = None


def enrich_cdc_change(item: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich a raw SQLite data_changes row for both backend and frontend consumers."""
    out = dict(item)
    diff_obj = out.get("diff") or {}
    summary_str = out.get("diff_summary") or out.get("summary") or ""
    patch_ver = out.get("patch_version") or "2026-11-13"

    affected = list(out.get("affected_jobs") or ["all"])
    if "all" in affected:
        for jid in ALL_KNOWN_JOB_IDS:
            if jid not in affected:
                affected.append(jid)
    else:
        if "king" in affected and "the_king" not in affected:
            affected.append("the_king")
        if "necromancer" in affected and "wicked_necromancer" not in affected:
            affected.append("wicked_necromancer")

    out["affected_jobs"] = affected
    out["summary"] = summary_str
    out["diff_json"] = diff_obj
    out["sync_batch_id"] = f"cdc-{patch_ver}"
    out["impact_level"] = "HIGH"
    return out


def enrich_cdc_status(raw_status: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich get_cdc_status() output with frontend-compatible alias keys."""
    out = dict(raw_status)
    latest_patch = out.get("latest_patch_version") or "2026-11-13"
    out["tracked_entities_count"] = out.get("tracked_entities", 0)
    out["total_changes_detected"] = out.get("total_changes_logged", 0)
    out["active_patch_version"] = latest_patch
    out["sync_batch_id"] = f"cdc-{latest_patch}"
    out["wiki_url"] = "https://lumivaraonline.com/wiki/"
    out["changelog_url"] = "https://lumivaraonline.com/changelog/"
    out["db_engine"] = "SQLite3 + Canonical JSON SHA-256 CDC"
    out["backend_online"] = True
    if "recent_changes" in out and isinstance(out["recent_changes"], list):
        out["recent_changes"] = [enrich_cdc_change(c) for c in out["recent_changes"]]
    return out


@router.get("/status")
def api_cdc_status() -> Dict[str, Any]:
    """Return current CDC tracking status, entity counts, and recent changes."""
    return enrich_cdc_status(get_cdc_status())


@router.get("/changes")
def api_cdc_changes(
    job_id: Optional[str] = Query(default=None, description="Filter changes affecting a specific job_id"),
    limit: int = Query(default=50, ge=1, le=500, description="Max change records to return"),
) -> Dict[str, Any]:
    """Return CDC change log entries, optionally filtered by affected job_id."""
    normalized_job = None
    if job_id:
        raw_j = job_id.strip().lower()
        normalized_job = FRONTEND_JOB_ALIASES.get(raw_j, raw_j)

    raw_changes = get_cdc_changes(job_id=normalized_job, limit=limit)
    enriched = [enrich_cdc_change(c) for c in raw_changes]
    status = enrich_cdc_status(get_cdc_status())
    return {
        "changes": enriched,
        "count": len(enriched),
        "status": status,
    }


@router.post("/sync")
def api_cdc_sync(
    payload: Optional[SyncPayload] = Body(default=None),
    fetch_live: Optional[bool] = Query(default=None),
    simulate_patch: Optional[bool] = Query(default=None),
) -> Dict[str, Any]:
    """
    Trigger a Wiki & Changelog synchronization run with Canonical JSON SHA-256
    hash comparison. Supports `simulate_patch=True` to test CDC change detection.
    """
    resolved_sim = (
        simulate_patch
        if simulate_patch is not None
        else (payload.simulate_patch if payload and payload.simulate_patch is not None else False)
    )
    resolved_live = (
        fetch_live
        if fetch_live is not None
        else (payload.fetch_live if payload and payload.fetch_live is not None else (not resolved_sim))
    )

    sync_res = run_sync(fetch_live=bool(resolved_live), simulate_patch=bool(resolved_sim))
    status = enrich_cdc_status(get_cdc_status())
    changes = [enrich_cdc_change(c) for c in get_cdc_changes(limit=50)]

    if resolved_sim:
        msg = (
            f"【CDC 偵測觸發】模擬平衡改版已寫入 SQLite：偵測到 {sync_res['new_changes_detected']} 項 "
            f"SHA-256 雜湊異動 ({status['active_patch_version']})！"
        )
    else:
        msg = (
            f"已完成 Lumivara Wiki 與 Seed 基準同步 ({status['tracked_entities']} 個實體 SHA-256 雜湊校驗完畢，"
            f"本次新增異動 {sync_res['new_changes_detected']} 筆)。"
        )

    return {
        **sync_res,
        "status": status,
        "changes": changes,
        "message": msg,
    }

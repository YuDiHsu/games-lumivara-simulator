"""SQLite Database Connection, Initialization, and Metadata/CDC Query Helpers."""

from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "lumivara.db"
SCHEMA_SQL_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_connection(db_path: Optional[Path | str] = None) -> sqlite3.Connection:
    """Return a sqlite3.Connection with Row factory and foreign keys enabled."""
    target_path = Path(db_path) if db_path is not None else DEFAULT_DB_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path: Optional[Path | str] = None) -> None:
    """Initialize SQLite schema from schema.sql."""
    schema_sql = SCHEMA_SQL_PATH.read_text(encoding="utf-8")
    with closing(get_connection(db_path)) as conn:
        conn.executescript(schema_sql)
        conn.commit()


def _parse_json_safe(raw: Optional[str], default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def get_jobs(db_path: Optional[Path | str] = None) -> List[Dict[str, Any]]:
    """Fetch all jobs with their JSON fields parsed and associated skills attached."""
    with closing(get_connection(db_path)) as conn:
        job_rows = conn.execute("SELECT * FROM jobs ORDER BY CASE tier WHEN 'novice' THEN 0 WHEN 'first' THEN 1 ELSE 2 END, id").fetchall()
        skill_rows = conn.execute("SELECT * FROM skills ORDER BY job_id, skill_type, id").fetchall()

    skills_by_job: Dict[str, List[Dict[str, Any]]] = {}
    for sr in skill_rows:
        sk = dict(sr)
        sk["vit_tier_hp_scale"] = bool(sk.get("vit_tier_hp_scale"))
        sk["uses_weapon_coating"] = bool(sk.get("uses_weapon_coating"))
        sk["never_misses"] = bool(sk.get("never_misses"))
        sk["can_crit"] = bool(sk.get("can_crit"))
        sk["cooldown_from_aspd"] = bool(sk.get("cooldown_from_aspd"))
        sk["aspd_floor"] = bool(sk.get("aspd_floor"))
        skills_by_job.setdefault(sk["job_id"], []).append(sk)

    jobs: List[Dict[str, Any]] = []
    for r in job_rows:
        item = dict(r)
        item["is_melee"] = bool(item.get("is_melee"))
        item["job_bonuses"] = _parse_json_safe(item.pop("job_bonuses_json", "{}"), {})
        item["innate_stats"] = _parse_json_safe(item.pop("innate_stats_json", "{}"), {})
        item["allowed_weapons"] = _parse_json_safe(item.pop("allowed_weapons_json", "[]"), [])
        item["active_stats"] = _parse_json_safe(item.pop("active_stats_json", "[]"), [])
        item["skills"] = skills_by_job.get(item["id"], [])
        jobs.append(item)
    return jobs


def get_skills(db_path: Optional[Path | str] = None, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch all skills (or skills for a specific job_id) with boolean flags parsed."""
    with closing(get_connection(db_path)) as conn:
        if job_id:
            rows = conn.execute("SELECT * FROM skills WHERE job_id = ? ORDER BY skill_type, id", (job_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM skills ORDER BY job_id, skill_type, id").fetchall()

    result: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["vit_tier_hp_scale"] = bool(item.get("vit_tier_hp_scale"))
        item["uses_weapon_coating"] = bool(item.get("uses_weapon_coating"))
        item["never_misses"] = bool(item.get("never_misses"))
        item["can_crit"] = bool(item.get("can_crit"))
        item["cooldown_from_aspd"] = bool(item.get("cooldown_from_aspd"))
        item["aspd_floor"] = bool(item.get("aspd_floor"))
        result.append(item)
    return result


def get_cross_passives(db_path: Optional[Path | str] = None) -> List[Dict[str, Any]]:
    """Fetch all cross-class passives with stats_json parsed into `stats`."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute("SELECT * FROM cross_passives ORDER BY id").fetchall()
    result: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["stats"] = _parse_json_safe(item.pop("stats_json", "{}"), {})
        result.append(item)
    return result


def get_equipment(db_path: Optional[Path | str] = None) -> List[Dict[str, Any]]:
    """Fetch all equipment items with stats_json and allowed_jobs_json parsed."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute("SELECT * FROM equipment ORDER BY slot, tier DESC, id").fetchall()
    result: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["is_two_handed"] = bool(item.get("is_two_handed"))
        item["stats"] = _parse_json_safe(item.pop("stats_json", "{}"), {})
        item["allowed_jobs"] = _parse_json_safe(item.pop("allowed_jobs_json", '["all"]'), ["all"])
        result.append(item)
    return result


def get_armor_sets(db_path: Optional[Path | str] = None) -> List[Dict[str, Any]]:
    """Fetch all armor sets with bonuses_json and eligible_slots_json parsed."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute("SELECT * FROM armor_sets ORDER BY pieces_required, id").fetchall()
    result: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["bonuses"] = _parse_json_safe(item.pop("bonuses_json", "{}"), {})
        item["eligible_slots"] = _parse_json_safe(
            item.pop("eligible_slots_json", '["head","face","mouth","armor","garment","shoes"]'),
            ["head", "face", "mouth", "armor", "garment", "shoes"],
        )
        result.append(item)
    return result


def get_cards(db_path: Optional[Path | str] = None) -> List[Dict[str, Any]]:
    """Fetch all monster cards with bonuses_json, mechanics_json, slots_json, and source_monsters_json parsed."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute("SELECT * FROM cards ORDER BY slot, is_limited DESC, id").fetchall()
    result: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["is_limited"] = bool(item.get("is_limited"))
        item["removable"] = bool(item.get("removable", 1))
        item["bonuses"] = _parse_json_safe(item.pop("bonuses_json", "{}"), {})
        item["mechanics"] = _parse_json_safe(item.pop("mechanics_json", "[]"), [])
        item["slots"] = _parse_json_safe(item.pop("slots_json", f'["{item["slot"]}"]'), [item["slot"]])
        item["source_monsters"] = _parse_json_safe(item.pop("source_monsters_json", "[]"), [])
        result.append(item)
    return result


def get_wiki_metadata(db_path: Optional[Path | str] = None) -> Dict[str, Any]:
    """Fetch stored Wiki metadata entries (`card_mechanics`, `card_mechanics_params`, `equipment_affix_system`)."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute("SELECT key, value_json FROM wiki_metadata").fetchall()
    return {r["key"]: _parse_json_safe(r["value_json"], {}) for r in rows}


def get_monsters(db_path: Optional[Path | str] = None) -> List[Dict[str, Any]]:
    """Fetch all target monster/PvP presets."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute("SELECT * FROM monsters ORDER BY is_monster DESC, level DESC, def DESC, id").fetchall()
    result: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["is_boss"] = bool(item.get("is_boss"))
        item["is_monster"] = bool(item.get("is_monster"))
        item["areas"] = _parse_json_safe(item.pop("areas_json", "[]"), [])
        result.append(item)
    return result


def get_all_meta(db_path: Optional[Path | str] = None) -> Dict[str, Any]:
    """Return all metadata tables parsed into clean Python dicts."""
    wiki_meta = get_wiki_metadata(db_path)
    return {
        "jobs": get_jobs(db_path),
        "skills": get_skills(db_path),
        "cross_passives": get_cross_passives(db_path),
        "equipment": get_equipment(db_path),
        "armor_sets": get_armor_sets(db_path),
        "cards": get_cards(db_path),
        "monsters": get_monsters(db_path),
        "card_mechanics": wiki_meta.get("card_mechanics", {}),
        "card_mechanics_params": wiki_meta.get("card_mechanics_params", {}),
        "equipment_affix_system": wiki_meta.get("equipment_affix_system", {}),
    }


def get_cdc_changes(
    db_path: Optional[Path | str] = None,
    job_id: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Fetch recent CDC change records, optionally filtered by affected job_id."""
    with closing(get_connection(db_path)) as conn:
        rows = conn.execute(
            "SELECT * FROM data_changes ORDER BY id DESC LIMIT ?",
            (limit * 2 if job_id else limit,),
        ).fetchall()

    changes: List[Dict[str, Any]] = []
    for r in rows:
        item = dict(r)
        item["diff"] = _parse_json_safe(item.pop("diff_json", "{}"), {})
        affected_jobs = _parse_json_safe(item.pop("affected_jobs_json", '["all"]'), ["all"])
        item["affected_jobs"] = affected_jobs
        if job_id and "all" not in affected_jobs and job_id not in affected_jobs:
            continue
        changes.append(item)
        if len(changes) >= limit:
            break
    return changes


def get_cdc_status(db_path: Optional[Path | str] = None) -> Dict[str, Any]:
    """Return summary of CDC tracking status, entity counts, last sync timestamp, and recent changes."""
    with closing(get_connection(db_path)) as conn:
        total_hashes = conn.execute("SELECT COUNT(*) AS cnt FROM entity_hashes").fetchone()["cnt"]
        last_sync_row = conn.execute("SELECT MAX(updated_at) AS last_sync FROM entity_hashes").fetchone()
        total_changes = conn.execute("SELECT COUNT(*) AS cnt FROM data_changes").fetchone()["cnt"]
        by_type_rows = conn.execute(
            "SELECT entity_type, COUNT(*) AS cnt FROM entity_hashes GROUP BY entity_type"
        ).fetchall()

    entity_counts = {r["entity_type"]: r["cnt"] for r in by_type_rows}
    recent_changes = get_cdc_changes(db_path=db_path, limit=10)
    latest_patch = recent_changes[0]["patch_version"] if recent_changes else "2026-11-13"

    return {
        "tracked_entities": total_hashes,
        "entity_counts": entity_counts,
        "total_changes_logged": total_changes,
        "last_sync_at": last_sync_row["last_sync"] if last_sync_row and last_sync_row["last_sync"] else None,
        "latest_patch_version": latest_patch,
        "recent_changes": recent_changes,
    }

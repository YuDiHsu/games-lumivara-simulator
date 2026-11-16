"""Tests for SQLite Schema, Canonical JSON SHA-256 Hashing, and CDC Change Detection."""

from __future__ import annotations

from pathlib import Path

from backend.db.database import get_all_meta, get_cdc_changes, get_cdc_status
from backend.scraper.cdc_engine import (
    canonical_json,
    compute_canonical_hash,
    compute_field_diff,
    run_sync,
)


def test_canonical_json_and_hash_determinism() -> None:
    """Canonical JSON ignores key ordering and volatile timestamps (`updated_at`, `detected_at`)."""
    entity_a = {
        "id": "lightdevastation",
        "name": "Grand Light Devastation",
        "atk_scale": 10.0,
        "bonuses": {"vit": 60, "hp_pct": 0.10},
        "updated_at": "2026-11-13T00:00:00Z",
    }
    entity_b = {
        "bonuses": {"hp_pct": 0.10, "vit": 60},
        "atk_scale": 10.0,
        "name": "Grand Light Devastation",
        "id": "lightdevastation",
        "updated_at": "2026-11-15T12:34:56Z",
    }
    assert canonical_json(entity_a) == canonical_json(entity_b)
    assert compute_canonical_hash(entity_a) == compute_canonical_hash(entity_b)

    entity_modified = dict(entity_a, atk_scale=12.0)
    assert compute_canonical_hash(entity_a) != compute_canonical_hash(entity_modified)


def test_compute_field_diff() -> None:
    """Field-level diff accurately identifies modified nested and scalar fields."""
    old_ent = {
        "id": "lightdevastation",
        "name": "Grand Light Devastation",
        "atk_scale": 10.0,
        "cooldown": 12.0,
    }
    new_ent = {
        "id": "lightdevastation",
        "name": "Grand Light Devastation",
        "atk_scale": 12.0,
        "cooldown": 10.0,
    }
    diffs, summary = compute_field_diff(old_ent, new_ent)
    assert "atk_scale" in diffs
    assert diffs["atk_scale"] == {"old": 10.0, "new": 12.0}
    assert "cooldown" in diffs
    assert diffs["cooldown"] == {"old": 12.0, "new": 10.0}
    assert "Grand Light Devastation" in summary


def test_cdc_sync_bootstrap_and_simulated_patch(tmp_path: Path) -> None:
    """
    Verify initial bootstrap populates all 7 domain tables + entity_hashes with exact Wiki counts,
    idempotent re-sync logs 0 new changes, and `simulate_patch=True` detects
    SHA-256 hash mutations and logs `MODIFIED` records into `data_changes`.
    """
    test_db = tmp_path / "test_lumivara.db"

    # 1. Initial bootstrap sync (seed data)
    res_init = run_sync(db_path=test_db, fetch_live=False, simulate_patch=False)
    assert res_init["status"] == "ok"
    assert res_init["is_initial_bootstrap"] is True
    assert res_init["seeded_history_count"] >= 4
    assert res_init["new_changes_detected"] == 0

    meta = get_all_meta(db_path=test_db)
    assert len(meta["jobs"]) == 15
    assert len(meta["cross_passives"]) == 56
    assert len(meta["armor_sets"]) == 11
    assert len(meta["cards"]) == 102
    assert len(meta["monsters"]) == 101

    # Verify exact Wiki Sunfire Colossus Card stats in SQLite
    colossus = next((c for c in meta["cards"] if c["id"] == "colossus_card"), None)
    assert colossus is not None
    assert colossus["name"] == "Sunfire Colossus Card"
    assert colossus["bonuses"]["str"] == 8
    assert colossus["bonuses"]["atk_pct"] == 0.03
    assert colossus["bonuses"]["phys_pierce"] == 0.05

    # 2. Idempotent second sync without changes -> 0 new changes
    res_second = run_sync(db_path=test_db, fetch_live=False, simulate_patch=False)
    assert res_second["is_initial_bootstrap"] is False
    assert res_second["new_changes_detected"] == 0

    # 3. Simulated balance patch -> detects 2 modified entities via SHA-256 hash diff
    res_patch = run_sync(db_path=test_db, fetch_live=False, simulate_patch=True)
    assert res_patch["new_changes_detected"] == 2
    modified_ids = {c["entity_id"] for c in res_patch["detected_changes"]}
    assert "lightdevastation" in modified_ids
    assert "lm01_limited_card" in modified_ids

    status = get_cdc_status(db_path=test_db)
    assert status["total_changes_logged"] == res_init["seeded_history_count"] + 2
    templar_changes = get_cdc_changes(db_path=test_db, job_id="templar")
    assert any(c["entity_id"] == "lightdevastation" for c in templar_changes)

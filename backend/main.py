"""FastAPI Application Entrypoint for Lumivara Online Build & DPS Optimizer."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import cdc_router, meta_router, optimize_router
from backend.db.database import DEFAULT_DB_PATH, get_cdc_status, init_db
from backend.scraper.cdc_engine import run_sync


def ensure_database_ready() -> None:
    """Initialize SQLite schema and seed baseline Wiki/CDC snapshot if empty."""
    init_db(DEFAULT_DB_PATH)
    status = get_cdc_status(DEFAULT_DB_PATH)
    if status.get("tracked_entities", 0) == 0:
        run_sync(db_path=DEFAULT_DB_PATH, fetch_live=False, simulate_patch=False)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    ensure_database_ready()
    yield


# Ensure DB is initialized even when imported directly by TestClient without lifespan context
ensure_database_ready()

app = FastAPI(
    title="Lumivara Online Build & DPS Optimizer API",
    description=(
        "Full-stack character stat, 4/4 cross-class passive, 3x2 armor set, and 8-slot card "
        "DPS optimizer with SQLite Canonical JSON SHA-256 CDC tracking."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta_router)
app.include_router(cdc_router)
app.include_router(optimize_router)


@app.get("/api/health", tags=["health"])
def health_check() -> Dict[str, Any]:
    """Health check endpoint verifying API & SQLite CDC readiness."""
    status = get_cdc_status(DEFAULT_DB_PATH)
    return {
        "status": "ok",
        "service": "lumivara-optimizer",
        "tracked_entities": status.get("tracked_entities", 0),
        "latest_patch_version": status.get("latest_patch_version", "2026-11-13"),
    }

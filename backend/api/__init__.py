"""FastAPI Routers for Lumivara Online Build & DPS Optimizer."""

from backend.api.routes_cdc import router as cdc_router
from backend.api.routes_meta import router as meta_router
from backend.api.routes_optimize import router as optimize_router

__all__ = ["meta_router", "cdc_router", "optimize_router"]

"""Development-only introspection endpoints - disabled (404) outside `APP_ENV=development`
so cache contents and poller internals are never exposed on a deployed instance."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from config import get_settings
from services.live_hub import hub
from utils import metrics
from utils.cache import cache

router = APIRouter(prefix="/api/debug", tags=["debug"])


def _require_development() -> None:
    if get_settings().app_env != "development":
        raise HTTPException(status_code=404, detail="Not found")


@router.get("/cache")
def debug_cache():
    _require_development()
    entries = cache.debug_snapshot()
    return {"count": len(entries), "entries": entries}


@router.get("/metrics")
def debug_metrics():
    """Distinguishes our own proactive rate-limiting from the provider's real 429s, and
    how often stale fallback data gets served - see utils/metrics.py."""
    _require_development()
    return metrics.snapshot()


@router.get("/data-freshness/{symbol}")
def debug_data_freshness(symbol: str):
    _require_development()
    snapshot = hub.get_snapshot(symbol)
    return {
        "symbol": snapshot.symbol,
        "version": snapshot.version,
        "is_stale": snapshot.is_stale,
        "error_code": snapshot.error_code,
        "quote_updated_at": snapshot.quote_updated_at,
        "quote_cache_age_seconds": cache.entry_age_seconds(f"quote:{symbol.upper()}"),
        "market_status_updated_at": snapshot.market_status_updated_at,
        "indicators_updated_at": snapshot.indicators_updated_at,
        "prediction_updated_at": snapshot.prediction_updated_at,
        "risk_updated_at": snapshot.risk_updated_at,
        "history_cache_age_seconds": cache.entry_age_seconds(f"history:{symbol.upper()}:1y:1d"),
    }

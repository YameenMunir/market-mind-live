from __future__ import annotations

import logging
from datetime import datetime, timezone

from data.symbols import lookup_symbol, search_symbols
from models.schemas import AssetFundamentals, AssetSearchResult, AssetType
from services.price_service import check_rate_limit
from utils import metrics
from utils.cache import cache
from utils.durable_fallback_cache import durable_get, durable_set
from utils.errors import AppError

logger = logging.getLogger(__name__)

# How long a successfully-fetched fundamentals snapshot stays servable as a stale
# fallback once a later refetch is rate-limited/errors - fundamentals (P/E, margins,
# analyst targets, etc.) change slowly, so serving an hours-old value during a
# provider outage beats a hard error. Mirrors services/analyst_service.py.
_FALLBACK_TTL_SECONDS = 24 * 60 * 60


def search_assets(query: str, asset_type: AssetType | None = None, limit: int = 15) -> list[AssetSearchResult]:
    results = search_symbols(query, asset_type=asset_type, limit=limit)
    return [AssetSearchResult(**entry) for entry in results]


def resolve_asset_metadata(symbol: str) -> dict | None:
    return lookup_symbol(symbol)


def get_asset_fundamentals(symbol: str) -> AssetFundamentals:
    from data.yfinance_provider import provider

    symbol = symbol.upper()
    fallback_key = f"fundamentals_fallback:{symbol}"

    try:
        check_rate_limit(symbol)
        raw = provider.get_fundamentals(symbol)
        result = AssetFundamentals(**raw, as_of=datetime.now(timezone.utc).isoformat())
        cache.set(fallback_key, result, _FALLBACK_TTL_SECONDS)
        durable_set(fallback_key, result)
        return result
    except AppError as exc:
        stale = cache.get(fallback_key) or durable_get(fallback_key, AssetFundamentals)
        if stale is None:
            raise
        metrics.increment("fundamentals.served_stale")
        logger.warning(
            "Fundamentals for %s: live fetch failed (%s) - serving stale cache from %s.",
            symbol, exc.error_code.value, stale.as_of,
        )
        return stale.model_copy(update={"is_stale": True})

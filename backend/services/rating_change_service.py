from __future__ import annotations

import logging
from datetime import datetime, timezone

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import RatingChange, RatingChangeFeed
from services.price_service import check_rate_limit
from utils import metrics
from utils.cache import cache
from utils.errors import AppError

logger = logging.getLogger(__name__)
settings = get_settings()

# Same rationale as analyst_service.py's _FALLBACK_TTL_SECONDS: how long a successfully
# fetched value stays servable as a stale fallback once the fresh cache entry expires
# and a live refetch fails (self-throttled or a real provider rate limit/outage).
_FALLBACK_TTL_SECONDS = 24 * 60 * 60


def get_rating_changes(symbol: str, count: int = 20) -> RatingChangeFeed:
    fallback_key = f"rating_changes_fallback:{symbol.upper()}"

    def _fetch() -> RatingChangeFeed:
        check_rate_limit(symbol)
        raw_changes = provider.get_rating_changes(symbol, count=count)
        result = RatingChangeFeed(
            symbol=symbol.upper(),
            changes=[RatingChange(**change) for change in raw_changes],
            as_of=datetime.now(timezone.utc).isoformat(),
        )
        cache.set(fallback_key, result, _FALLBACK_TTL_SECONDS)
        return result

    key = f"rating_changes:{symbol.upper()}:{count}"
    try:
        return cache.get_or_set(key, settings.rating_changes_cache_ttl_seconds, _fetch)
    except AppError as exc:
        stale = cache.get(fallback_key)
        if stale is None:
            raise
        metrics.increment("rating_changes.served_stale")
        logger.warning(
            "Rating changes for %s: live fetch failed (%s) - serving stale cache from %s.",
            symbol.upper(), exc.error_code.value, stale.as_of,
        )
        return stale.model_copy(update={"is_stale": True})

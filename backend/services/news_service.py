from __future__ import annotations

import logging
from datetime import datetime, timezone

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import NewsArticle, NewsFeed
from services.price_service import check_rate_limit
from utils import metrics
from utils.cache import cache
from utils.durable_fallback_cache import durable_get, durable_set
from utils.errors import AppError

logger = logging.getLogger(__name__)
settings = get_settings()

# Same rationale as analyst_service.py's _FALLBACK_TTL_SECONDS: how long a successfully
# fetched value stays servable as a stale fallback once the fresh cache entry expires
# and a live refetch fails (self-throttled or a real provider rate limit/outage).
_FALLBACK_TTL_SECONDS = 24 * 60 * 60


def get_news(symbol: str, count: int = 10) -> NewsFeed:
    fallback_key = f"news_fallback:{symbol.upper()}"

    def _fetch() -> NewsFeed:
        check_rate_limit(symbol)
        raw_articles = provider.get_news(symbol, count=count)
        result = NewsFeed(
            symbol=symbol.upper(),
            articles=[NewsArticle(**article) for article in raw_articles],
            as_of=datetime.now(timezone.utc).isoformat(),
        )
        cache.set(fallback_key, result, _FALLBACK_TTL_SECONDS)
        durable_set(fallback_key, result)
        return result

    key = f"news:{symbol.upper()}:{count}"
    try:
        return cache.get_or_set(key, settings.news_cache_ttl_seconds, _fetch)
    except AppError as exc:
        # The in-memory fallback is wiped on every process restart (e.g. a cold start
        # on a host that sleeps when idle) - the durable copy survives that, so it's
        # checked second whenever the fast in-memory one is empty.
        stale = cache.get(fallback_key) or durable_get(fallback_key, NewsFeed)
        if stale is None:
            raise
        metrics.increment("news.served_stale")
        logger.warning(
            "News for %s: live fetch failed (%s) - serving stale cache from %s.",
            symbol.upper(), exc.error_code.value, stale.as_of,
        )
        return stale.model_copy(update={"is_stale": True})

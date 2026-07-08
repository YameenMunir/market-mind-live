from __future__ import annotations

from datetime import datetime, timezone

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import AnalystConsensus, AnalystRating
from services.price_service import check_rate_limit
from utils.cache import cache

settings = get_settings()

# Standard 1 (best) - 5 (worst) analyst-rating convention, matching how Yahoo itself
# weights recommendationMean - lets us collapse a strongBuy/buy/hold/sell/strongSell
# breakdown into the same single bullish/neutral/bearish shape as the app's own
# rule-based prediction, so the two are directly comparable side by side.
_RATING_WEIGHTS = {"strong_buy": 1, "buy": 2, "hold": 3, "sell": 4, "strong_sell": 5}


def _derive_rating(counts: dict[str, int]) -> AnalystRating:
    total = sum(counts.values())
    if total == 0:
        return AnalystRating.NOT_COVERED

    weighted = sum(_RATING_WEIGHTS[key] * value for key, value in counts.items()) / total
    if weighted <= 1.5:
        return AnalystRating.STRONG_BUY
    if weighted <= 2.5:
        return AnalystRating.BUY
    if weighted <= 3.5:
        return AnalystRating.HOLD
    if weighted <= 4.5:
        return AnalystRating.SELL
    return AnalystRating.STRONG_SELL


def get_analyst_consensus(symbol: str, currency: str = "USD") -> AnalystConsensus:
    def _fetch() -> AnalystConsensus:
        check_rate_limit(symbol)
        raw = provider.get_analyst_consensus(symbol)
        counts = {key: raw.get(key, 0) for key in _RATING_WEIGHTS}

        return AnalystConsensus(
            symbol=symbol.upper(),
            rating=_derive_rating(counts),
            total_analysts=sum(counts.values()),
            **counts,
            price_target_low=raw.get("price_target_low"),
            price_target_high=raw.get("price_target_high"),
            price_target_mean=raw.get("price_target_mean"),
            price_target_median=raw.get("price_target_median"),
            currency=currency,
            as_of=datetime.now(timezone.utc).isoformat(),
        )

    # Keyed only by symbol (not currency) - currency is just a label on the cached
    # result, cheap to overwrite, and keying on it would multiply cache entries for
    # no benefit since the underlying analyst data itself doesn't depend on it.
    key = f"analyst:{symbol.upper()}"
    result = cache.get_or_set(key, settings.analyst_cache_ttl_seconds, _fetch)
    if result.currency != currency:
        result = result.model_copy(update={"currency": currency})
    return result

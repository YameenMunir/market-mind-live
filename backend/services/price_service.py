from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import Candle, CandleSeries, PriceQuote
from services.market_status_service import get_market_status
from utils.cache import RateLimiter, cache
from utils.errors import RateLimitedError, ValidationError

settings = get_settings()
_rate_limiter = RateLimiter(max_per_minute=settings.provider_rate_limit_per_minute)
# Yahoo's real throttling is IP-wide, not per-symbol - this catches a dashboard watching
# many symbols simultaneously that would otherwise stay under every individual symbol's
# quota while still tripping Yahoo's actual limit.
_global_rate_limiter = RateLimiter(max_per_minute=settings.provider_global_rate_limit_per_minute)
_GLOBAL_KEY = "__global__"

# Chart time-range options -> how far back to fetch, what candle size to request, and how
# long a fetched response may be served from cache before the next filter click/poll must
# hit the provider again. "period" values map directly to yfinance's native period shorthand.
# "days" ranges (1wk/2wk) have no native Yahoo period string, so they're fetched via an
# explicit start/end window instead. "ytd" is likewise computed explicitly (Jan 1 of the
# current year -> now) rather than relying on yfinance's own "ytd" period, so the window is
# exact and independent of yfinance's interpretation. "max" is still a native Yahoo period
# (the full history Yahoo has for the symbol).
#
# cache_ttl_seconds is intentionally tiered: short for intraday/short-term ranges so the
# chart never shows a stale "latest" candle while the market is moving, and much longer for
# multi-year/max ranges whose bars (weekly/monthly) are effectively static within a session.
RANGE_CONFIG: dict[str, dict] = {
    "1d": {"period": "1d", "bar_interval": "5m", "cache_ttl_seconds": 15},
    "5d": {"period": "5d", "bar_interval": "15m", "cache_ttl_seconds": 15},
    "1wk": {"days": 7, "bar_interval": "30m", "cache_ttl_seconds": 60},
    "2wk": {"days": 14, "bar_interval": "1h", "cache_ttl_seconds": 60},
    "1mo": {"period": "1mo", "bar_interval": "1d", "cache_ttl_seconds": 120},
    "3mo": {"period": "3mo", "bar_interval": "1d", "cache_ttl_seconds": 120},
    "6mo": {"period": "6mo", "bar_interval": "1d", "cache_ttl_seconds": 120},
    "ytd": {"ytd": True, "bar_interval": "1d", "cache_ttl_seconds": 120},
    "1y": {"period": "1y", "bar_interval": "1d", "cache_ttl_seconds": 120},
    "2y": {"period": "2y", "bar_interval": "1wk", "cache_ttl_seconds": 900},
    "5y": {"period": "5y", "bar_interval": "1wk", "cache_ttl_seconds": 900},
    "max": {"period": "max", "bar_interval": "1mo", "cache_ttl_seconds": 3600},
}
DEFAULT_RANGE = "1d"


def _check_rate_limit(symbol: str) -> None:
    if not _global_rate_limiter.check(_GLOBAL_KEY):
        raise RateLimitedError(
            "Too many requests across all symbols in a short period.",
            detail="Please wait a moment before refreshing again.",
        )
    if not _rate_limiter.check(symbol.upper()):
        raise RateLimitedError(
            "Too many requests for this symbol in a short period.",
            detail="Please wait a moment before refreshing again.",
        )


def _quote_from_raw(symbol: str, raw: dict) -> PriceQuote:
    change = raw["price"] - raw["previous_close"]
    change_percent = (change / raw["previous_close"] * 100) if raw["previous_close"] else 0.0
    return PriceQuote(
        symbol=symbol.upper(),
        price=round(raw["price"], 6),
        change=round(change, 6),
        change_percent=round(change_percent, 4),
        previous_close=round(raw["previous_close"], 6),
        day_high=raw.get("day_high"),
        day_low=raw.get("day_low"),
        volume=raw.get("volume"),
        currency=raw.get("currency", "USD"),
        as_of=datetime.now(timezone.utc).isoformat(),
        is_delayed=True,
    )


def get_quote(symbol: str) -> PriceQuote:
    def _fetch() -> PriceQuote:
        _check_rate_limit(symbol)
        raw = provider.get_quote(symbol)
        return _quote_from_raw(symbol, raw)

    return cache.get_or_set(f"quote:{symbol.upper()}", settings.quote_cache_ttl_seconds, _fetch)


def get_quotes_batch(symbols: list[str]) -> dict[str, PriceQuote | Exception]:
    """Quotes for multiple symbols, reusing the same per-symbol cache as `get_quote` so a
    watchlist/overview call and an individual dashboard call for the same symbol never
    disagree or double-fetch. Only symbols that are actually cache-misses get sent to the
    provider's batch fetch - and that fetch runs as a single `yf.Tickers` call shared
    across all of them, rather than one `yf.Ticker()` request per symbol.
    """
    unique_symbols = list(dict.fromkeys(s.upper() for s in symbols))
    results: dict[str, PriceQuote | Exception] = {}
    misses: list[str] = []

    for symbol in unique_symbols:
        cached = cache.get(f"quote:{symbol}")
        if cached is not None:
            results[symbol] = cached
        else:
            misses.append(symbol)

    if misses:
        for symbol in misses:
            if not _global_rate_limiter.check(_GLOBAL_KEY):
                results[symbol] = RateLimitedError(
                    "Too many requests across all symbols in a short period.",
                    detail="Please wait a moment before refreshing again.",
                )
            elif not _rate_limiter.check(symbol):
                results[symbol] = RateLimitedError(
                    "Too many requests for this symbol in a short period.",
                    detail="Please wait a moment before refreshing again.",
                )
        fetchable = [s for s in misses if s not in results]
        if fetchable:
            raw_results = provider.get_quotes_batch(fetchable)
            for symbol, raw in raw_results.items():
                if isinstance(raw, Exception):
                    results[symbol] = raw
                else:
                    quote = _quote_from_raw(symbol, raw)
                    cache.set(f"quote:{symbol}", quote, settings.quote_cache_ttl_seconds)
                    results[symbol] = quote

    return results


def get_candles(symbol: str, range_key: str = DEFAULT_RANGE) -> CandleSeries:
    if range_key not in RANGE_CONFIG:
        raise ValidationError(
            f"'{range_key}' is not a supported chart range.",
            detail=f"Supported ranges: {', '.join(RANGE_CONFIG)}.",
        )
    config = RANGE_CONFIG[range_key]
    bar_interval = config["bar_interval"]

    def _fetch() -> CandleSeries:
        _check_rate_limit(symbol)
        if "days" in config:
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=config["days"])
            df = provider.get_history(symbol, interval=bar_interval, start=start, end=end)
        elif config.get("ytd"):
            end = datetime.now(timezone.utc)
            start = datetime(end.year, 1, 1, tzinfo=timezone.utc)
            df = provider.get_history(symbol, interval=bar_interval, start=start, end=end)
        else:
            df = provider.get_history(symbol, period=config["period"], interval=bar_interval)

        market_status = get_market_status(symbol)
        # Reuse the quote cache's currency if a quote for this symbol is already warm,
        # rather than triggering an extra upstream fetch just to learn the currency.
        cached_quote = cache.get(f"quote:{symbol.upper()}")
        currency = cached_quote.currency if isinstance(cached_quote, PriceQuote) else "USD"

        return CandleSeries(
            symbol=symbol.upper(),
            range=range_key,
            interval=bar_interval,
            currency=currency,
            market_status=market_status.session,
            is_market_open=market_status.is_open,
            last_updated=datetime.now(timezone.utc).isoformat(),
            candles=_dataframe_to_candles(df),
        )

    key = f"candles:{symbol.upper()}:{range_key}"
    return cache.get_or_set(key, config["cache_ttl_seconds"], _fetch)


def get_history_df(symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    def _fetch() -> pd.DataFrame:
        _check_rate_limit(symbol)
        return provider.get_history(symbol, period=period, interval=interval)

    # Indicators/predictions/risk/backtest all pull the same recent history for a symbol -
    # cache it so the live hub's frequent recompute cycles don't each trigger a fresh Yahoo call.
    key = f"history:{symbol.upper()}:{period}:{interval}"
    return cache.get_or_set(key, settings.candle_cache_ttl_seconds, _fetch)


def _dataframe_to_candles(df: pd.DataFrame) -> list[Candle]:
    candles: list[Candle] = []
    for ts, row in df.iterrows():
        candles.append(
            Candle(
                time=int(pd.Timestamp(ts).timestamp()),
                open=round(float(row["Open"]), 6),
                high=round(float(row["High"]), 6),
                low=round(float(row["Low"]), 6),
                close=round(float(row["Close"]), 6),
                volume=float(row["Volume"]) if "Volume" in row and pd.notna(row["Volume"]) else None,
            )
        )
    return candles

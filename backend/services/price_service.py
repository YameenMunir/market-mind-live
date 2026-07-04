from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import Candle, CandleSeries, PriceQuote
from utils.cache import RateLimiter, cache
from utils.errors import RateLimitedError

settings = get_settings()
_rate_limiter = RateLimiter(max_per_minute=settings.provider_rate_limit_per_minute)

# Chart time-range options -> how far back to fetch and what candle size to request.
# "period" values map directly to yfinance's native period shorthand (Yahoo supports
# these exactly). "days" ranges (1wk/2wk) have no native Yahoo period string, so they're
# fetched via an explicit start/end window instead. "ytd"/"max" are also native Yahoo
# periods, so YTD always starts from the first trading day of the current calendar year
# and MAX returns the full history Yahoo has for the symbol - both handled by yfinance
# itself, not computed here.
RANGE_CONFIG: dict[str, dict] = {
    "1d": {"period": "1d", "bar_interval": "5m"},
    "5d": {"period": "5d", "bar_interval": "15m"},
    "1wk": {"days": 7, "bar_interval": "30m"},
    "2wk": {"days": 14, "bar_interval": "1h"},
    "1mo": {"period": "1mo", "bar_interval": "1d"},
    "3mo": {"period": "3mo", "bar_interval": "1d"},
    "6mo": {"period": "6mo", "bar_interval": "1d"},
    "ytd": {"period": "ytd", "bar_interval": "1d"},
    "1y": {"period": "1y", "bar_interval": "1d"},
    "2y": {"period": "2y", "bar_interval": "1wk"},
    "5y": {"period": "5y", "bar_interval": "1wk"},
    "max": {"period": "max", "bar_interval": "1mo"},
}
DEFAULT_RANGE = "1d"


def _check_rate_limit(symbol: str) -> None:
    if not _rate_limiter.check(symbol.upper()):
        raise RateLimitedError(
            "Too many requests for this symbol in a short period.",
            detail="Please wait a moment before refreshing again.",
        )


def get_quote(symbol: str) -> PriceQuote:
    def _fetch() -> PriceQuote:
        _check_rate_limit(symbol)
        raw = provider.get_quote(symbol)
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

    return cache.get_or_set(f"quote:{symbol.upper()}", settings.quote_cache_ttl_seconds, _fetch)


def get_candles(symbol: str, interval: str = DEFAULT_RANGE) -> CandleSeries:
    range_key = interval if interval in RANGE_CONFIG else DEFAULT_RANGE
    config = RANGE_CONFIG[range_key]
    bar_interval = config["bar_interval"]

    def _fetch() -> CandleSeries:
        _check_rate_limit(symbol)
        if "days" in config:
            end = datetime.now(timezone.utc)
            start = end - timedelta(days=config["days"])
            df = provider.get_history(symbol, interval=bar_interval, start=start, end=end)
        else:
            df = provider.get_history(symbol, period=config["period"], interval=bar_interval)
        return CandleSeries(symbol=symbol.upper(), interval=range_key, candles=_dataframe_to_candles(df))

    key = f"candles:{symbol.upper()}:{range_key}"
    return cache.get_or_set(key, settings.candle_cache_ttl_seconds, _fetch)


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

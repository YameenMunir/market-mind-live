from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd

from config import get_settings
from data.yfinance_provider import provider
from models.schemas import Candle, CandleSeries, PriceQuote
from utils.cache import RateLimiter, cache
from utils.errors import RateLimitedError

settings = get_settings()
_rate_limiter = RateLimiter(max_per_minute=settings.provider_rate_limit_per_minute)

INTERVAL_TO_PERIOD = {
    "1m": "1d",
    "5m": "5d",
    "15m": "5d",
    "1h": "1mo",
    "1d": "1y",
    "1wk": "5y",
}


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


def get_candles(symbol: str, interval: str = "1d") -> CandleSeries:
    interval = interval if interval in INTERVAL_TO_PERIOD else "1d"
    period = INTERVAL_TO_PERIOD[interval]

    def _fetch() -> CandleSeries:
        _check_rate_limit(symbol)
        df = provider.get_history(symbol, period=period, interval=interval)
        return CandleSeries(symbol=symbol.upper(), interval=interval, candles=_dataframe_to_candles(df))

    key = f"candles:{symbol.upper()}:{interval}"
    return cache.get_or_set(key, settings.candle_cache_ttl_seconds, _fetch)


def get_history_df(symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    _check_rate_limit(symbol)
    return provider.get_history(symbol, period=period, interval=interval)


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

from __future__ import annotations

import logging
import random
import socket
import threading
import time
from datetime import datetime
from typing import Callable, TypeVar

import pandas as pd
import yfinance as yf
from yfinance.exceptions import YFRateLimitError

from config import get_settings
from data.provider import MarketDataProvider
from utils.errors import InvalidSymbolError, NetworkError, RateLimitedError

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Exceptions that represent a transient, retryable network failure rather than a bad
# symbol or a permanent provider error.
_TRANSIENT_EXCEPTIONS = (socket.gaierror, ConnectionError, TimeoutError)

# Yahoo's 429 throttling is IP-wide, not per-symbol - once it's been seen, every symbol's
# poller should stop hitting the network entirely for a short cooldown window rather than
# each independently retrying and compounding the problem. Shared across all callers in
# this process (module-level, not per-request) since it reflects the state of the shared
# upstream connection, not any one symbol.
_cooldown_lock = threading.Lock()
_cooldown_until = 0.0


def _in_cooldown() -> float | None:
    with _cooldown_lock:
        remaining = _cooldown_until - time.monotonic()
    return remaining if remaining > 0 else None


def _start_cooldown(seconds: float) -> None:
    global _cooldown_until
    with _cooldown_lock:
        _cooldown_until = max(_cooldown_until, time.monotonic() + seconds)


def _call_with_retry(fn: Callable[[], T], *, description: str) -> T:
    """Runs `fn`, retrying transient network failures with exponential backoff + jitter.

    yfinance/Yahoo has no official retry policy or backoff guidance, so this applies a
    conservative one (`provider_max_retries` attempts, doubling delay each time) before
    letting the failure surface as a NetworkError - protects against one-off DNS/connection
    blips without masking a genuinely down or rate-limited upstream.

    A rate limit (`YFRateLimitError`) is handled differently: it is *not* retried here
    (retrying immediately into an active rate limit only makes it worse) - instead it
    starts a shared cooldown and raises `RateLimitedError` straight away, so every other
    symbol's poller also backs off instead of piling on.
    """
    settings = get_settings()

    cooldown_remaining = _in_cooldown()
    if cooldown_remaining is not None:
        raise RateLimitedError(
            "Market data provider is rate-limiting this server.",
            detail=f"Cooling down for {cooldown_remaining:.0f}s before retrying.",
        )

    attempt = 0
    while True:
        try:
            return fn()
        except YFRateLimitError as exc:
            _start_cooldown(settings.provider_rate_limit_cooldown_seconds)
            logger.warning(
                "%s hit Yahoo's rate limit - cooling down all symbols for %.0fs.",
                description, settings.provider_rate_limit_cooldown_seconds,
            )
            raise RateLimitedError(
                "Market data provider is rate-limiting this server.", detail=str(exc)
            ) from exc
        except _TRANSIENT_EXCEPTIONS as exc:
            attempt += 1
            if attempt > settings.provider_max_retries:
                logger.error("%s failed after %d attempts: %s", description, attempt, exc)
                raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc
            delay = settings.provider_retry_base_delay_seconds * (2 ** (attempt - 1))
            delay += random.uniform(0, delay * 0.25)
            logger.warning(
                "%s failed (attempt %d/%d), retrying in %.2fs: %s",
                description, attempt, settings.provider_max_retries, delay, exc,
            )
            time.sleep(delay)


class YFinanceProvider(MarketDataProvider):
    """Live market data via the unofficial Yahoo Finance API (yfinance).

    No API key required - Yahoo's undocumented endpoints have never needed one. Polling-
    based (no native streaming), so the WebSocket layer polls this provider on an interval
    and pushes updates to clients. See `MarketDataProvider` for the swap-in seam if a paid,
    key-authenticated vendor (with real push streaming and rate-limit headers) is added later.
    """

    def get_quote(self, symbol: str) -> dict:
        ticker = yf.Ticker(symbol)
        try:
            fast_info = _call_with_retry(lambda: ticker.fast_info, description=f"get_quote({symbol})")
            last_price = fast_info.get("lastPrice") or fast_info.get("last_price")
            previous_close = fast_info.get("previousClose") or fast_info.get("previous_close")
            day_high = fast_info.get("dayHigh") or fast_info.get("day_high")
            day_low = fast_info.get("dayLow") or fast_info.get("day_low")
            volume = fast_info.get("lastVolume") or fast_info.get("last_volume")
            currency = fast_info.get("currency") or "USD"
        except (NetworkError, RateLimitedError):
            raise
        except Exception as exc:  # yfinance raises bare Exception/KeyError for bad symbols
            raise InvalidSymbolError(
                f"'{symbol}' is not a recognized asset symbol.", detail=str(exc)
            ) from exc

        if last_price is None or previous_close is None:
            history = self._safe_history(symbol, period="5d", interval="1d")
            if history.empty:
                raise InvalidSymbolError(f"No market data available for '{symbol}'.")
            last_row = history.iloc[-1]
            prev_row = history.iloc[-2] if len(history) > 1 else last_row
            last_price = float(last_row["Close"])
            previous_close = float(prev_row["Close"])
            day_high = float(last_row["High"])
            day_low = float(last_row["Low"])
            volume = float(last_row["Volume"])

        if last_price is None or previous_close in (None, 0):
            raise InvalidSymbolError(f"No market data available for '{symbol}'.")

        return {
            "price": float(last_price),
            "previous_close": float(previous_close),
            "day_high": float(day_high) if day_high is not None else None,
            "day_low": float(day_low) if day_low is not None else None,
            "volume": float(volume) if volume is not None else None,
            "currency": currency,
        }

    def get_history(
        self,
        symbol: str,
        period: str = "6mo",
        interval: str = "1d",
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> pd.DataFrame:
        return self._safe_history(symbol, period=period, interval=interval, start=start, end=end)

    def get_analyst_consensus(self, symbol: str) -> dict:
        ticker = yf.Ticker(symbol)

        try:
            targets = _call_with_retry(
                lambda: ticker.analyst_price_targets or {}, description=f"get_analyst_consensus.targets({symbol})"
            )
        except (NetworkError, RateLimitedError):
            raise
        except Exception:
            # No analyst coverage for this symbol is a normal outcome here (crypto,
            # forex, commodities, indices, and many small caps all lack coverage),
            # not a real error - fall back to an empty result rather than raising.
            targets = {}

        counts = {"strong_buy": 0, "buy": 0, "hold": 0, "sell": 0, "strong_sell": 0}
        try:
            trend = _call_with_retry(
                lambda: ticker.recommendations, description=f"get_analyst_consensus.recommendations({symbol})"
            )
        except (NetworkError, RateLimitedError):
            raise
        except Exception:
            trend = None

        if trend is not None and not trend.empty:
            current = trend[trend["period"] == "0m"]
            row = current.iloc[0] if not current.empty else trend.iloc[0]
            counts = {
                "strong_buy": int(row.get("strongBuy", 0) or 0),
                "buy": int(row.get("buy", 0) or 0),
                "hold": int(row.get("hold", 0) or 0),
                "sell": int(row.get("sell", 0) or 0),
                "strong_sell": int(row.get("strongSell", 0) or 0),
            }

        return {
            "price_target_low": targets.get("low"),
            "price_target_high": targets.get("high"),
            "price_target_mean": targets.get("mean"),
            "price_target_median": targets.get("median"),
            **counts,
        }

    def _safe_history(
        self,
        symbol: str,
        period: str,
        interval: str,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> pd.DataFrame:
        ticker = yf.Ticker(symbol)

        def _fetch() -> pd.DataFrame:
            if start is not None or end is not None:
                return ticker.history(start=start, end=end, interval=interval, auto_adjust=False)
            return ticker.history(period=period, interval=interval, auto_adjust=False)

        try:
            df = _call_with_retry(_fetch, description=f"get_history({symbol}, {interval})")
        except (NetworkError, RateLimitedError):
            raise
        except Exception as exc:
            raise InvalidSymbolError(
                f"'{symbol}' is not a recognized asset symbol.", detail=str(exc)
            ) from exc

        if df is None or df.empty:
            raise InvalidSymbolError(f"No historical data available for '{symbol}'.")
        return df

    def get_quotes_batch(self, symbols: list[str]) -> dict[str, dict | Exception]:
        """Fetches quotes for multiple symbols, keyed by (uppercased) symbol.

        yfinance has no single-request multi-symbol quote endpoint like a paid vendor's
        batch API - `yf.Tickers` is the closest equivalent: it shares one HTTP session
        across all symbols instead of each `yf.Ticker()` opening its own, which is the
        real efficiency gain available here. A per-symbol value is either the quote dict
        (same shape as `get_quote`) or the Exception raised for that symbol, so one bad
        ticker in a batch doesn't fail the whole request.
        """
        unique_symbols = list(dict.fromkeys(s.upper() for s in symbols))
        tickers = yf.Tickers(" ".join(unique_symbols))
        results: dict[str, dict | Exception] = {}

        for symbol in unique_symbols:
            try:
                ticker = tickers.tickers[symbol]
                fast_info = _call_with_retry(lambda t=ticker: t.fast_info, description=f"get_quotes_batch({symbol})")
                last_price = fast_info.get("lastPrice") or fast_info.get("last_price")
                previous_close = fast_info.get("previousClose") or fast_info.get("previous_close")
                if last_price is None or previous_close in (None, 0):
                    raise InvalidSymbolError(f"No market data available for '{symbol}'.")
                results[symbol] = {
                    "price": float(last_price),
                    "previous_close": float(previous_close),
                    "day_high": float(fast_info.get("dayHigh") or fast_info.get("day_high") or 0) or None,
                    "day_low": float(fast_info.get("dayLow") or fast_info.get("day_low") or 0) or None,
                    "volume": float(fast_info.get("lastVolume") or fast_info.get("last_volume") or 0) or None,
                    "currency": fast_info.get("currency") or "USD",
                }
            except (NetworkError, RateLimitedError) as exc:
                results[symbol] = exc
            except Exception as exc:
                results[symbol] = InvalidSymbolError(f"'{symbol}' is not a recognized asset symbol.", detail=str(exc))

        return results


provider = YFinanceProvider()

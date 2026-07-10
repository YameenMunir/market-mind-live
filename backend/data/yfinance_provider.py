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
from yfinance.exceptions import YFDataException, YFRateLimitError

from config import get_settings
from data.provider import MarketDataProvider
from utils import metrics
from utils.cache import cache
from utils.errors import InvalidSymbolError, NetworkError, RateLimitedError

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Exceptions that represent a transient, retryable network failure rather than a bad
# symbol or a permanent provider error.
_TRANSIENT_EXCEPTIONS = (socket.gaierror, ConnectionError, TimeoutError)

# yfinance runs on whichever HTTP backend is available at import time - curl_cffi
# when installed (the supported/default case), otherwise plain `requests` (see
# yfinance/_http.py). Either backend raises its *own* exception classes for a dropped
# connection or timeout, which are NOT instances of the builtin `ConnectionError`/
# `TimeoutError` above despite the similar names, so they'd otherwise slip past
# `_TRANSIENT_EXCEPTIONS` entirely. Matched by class name (mirroring yfinance's own
# `_is_transient_error` helper in yfinance/data.py, which has the identical problem
# and solves it the same way) rather than importing curl_cffi/requests directly, so
# this works regardless of which backend is actually active.
_TRANSIENT_ERROR_TYPE_NAMES = frozenset({
    "Timeout", "TimeoutError", "ConnectTimeout", "ReadTimeout",
    "ConnectionError", "ChunkedEncodingError", "RemoteDisconnected",
})

# Yahoo doesn't always signal throttling with a clean 429 - yfinance's own cookie-retry
# logic (yfinance/data.py) only raises YFRateLimitError for a 429 hit on a *second*,
# cookie-swapped request; a 429 on the first attempt, and a soft IP block (common for
# shared/cloud hosting ranges, returned as a plain 403), both surface as a generic
# HTTPError instead. Treated identically to a real rate limit here since the practical
# meaning - and the correct response - is the same: back off, don't treat it as "no
# data for this symbol".
_RATE_LIMIT_STATUS_CODES = frozenset({429, 403})
# Server-side/unavailable responses - retried with the same backoff as a connection
# failure rather than surfaced as "this symbol has no data".
_UNAVAILABLE_STATUS_CODES = frozenset({500, 502, 503, 504})

# Yahoo's 429 throttling is IP-wide, not per-symbol - once it's been seen, every symbol's
# poller should stop hitting the network entirely for a cooldown window rather than each
# independently retrying and compounding the problem. Shared across all callers in this
# process (module-level, not per-request) since it reflects the state of the shared
# upstream connection, not any one symbol.
#
# The cooldown escalates on consecutive hits (doubling each time, capped at
# provider_rate_limit_cooldown_max_seconds) rather than always reapplying the same fixed
# window - a real Yahoo-side block often outlasts one short cooldown, and retrying right as
# it expires only trips it again. The streak resets after any call actually succeeds, so a
# single transient hit doesn't leave the server permanently over-throttled.
_cooldown_lock = threading.Lock()
_cooldown_until = 0.0
_consecutive_rate_limit_hits = 0


def _in_cooldown() -> float | None:
    with _cooldown_lock:
        remaining = _cooldown_until - time.monotonic()
    return remaining if remaining > 0 else None


def _start_cooldown(base_seconds: float, max_seconds: float) -> float:
    global _cooldown_until, _consecutive_rate_limit_hits
    with _cooldown_lock:
        _consecutive_rate_limit_hits += 1
        escalated = min(base_seconds * (2 ** (_consecutive_rate_limit_hits - 1)), max_seconds)
        _cooldown_until = max(_cooldown_until, time.monotonic() + escalated)
        return escalated


def _reset_rate_limit_streak() -> None:
    global _consecutive_rate_limit_hits
    if _consecutive_rate_limit_hits:
        with _cooldown_lock:
            _consecutive_rate_limit_hits = 0


def _response_status_code(exc: Exception) -> int | None:
    """Best-effort HTTP status code for an exception from either HTTP backend yfinance
    may be using (curl_cffi.requests or plain requests) - both attach a `.response`
    object with a `.status_code` to their HTTPError, so this works without importing
    either backend directly.
    """
    response = getattr(exc, "response", None)
    return getattr(response, "status_code", None)


def _raise_rate_limited(exc: Exception, description: str, *, status_code: int | None = None) -> None:
    settings = get_settings()
    metrics.increment(f"rate_limit.provider_{status_code}" if status_code else "rate_limit.provider_429")
    cooldown_seconds = _start_cooldown(
        settings.provider_rate_limit_cooldown_seconds,
        settings.provider_rate_limit_cooldown_max_seconds,
    )
    label = f"a real rate limit (HTTP {status_code})" if status_code else "Yahoo's REAL rate limit (HTTP 429)"
    logger.warning(
        "%s hit %s - cooling down all symbols for %.0fs.",
        description, label, cooldown_seconds,
    )
    raise RateLimitedError(
        "Market data provider is rate-limiting this server.", detail=str(exc)
    ) from exc


def _retry_or_raise_network_error(exc: Exception, attempt: int, description: str) -> int:
    """Sleeps with exponential backoff + jitter and returns the incremented attempt
    count, or raises NetworkError once `provider_max_retries` is exhausted.
    """
    settings = get_settings()
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
    return attempt


def _call_with_retry(fn: Callable[[], T], *, description: str) -> T:
    """Runs `fn`, retrying transient network failures with exponential backoff + jitter.

    yfinance/Yahoo has no official retry policy or backoff guidance, so this applies a
    conservative one (`provider_max_retries` attempts, doubling delay each time) before
    letting the failure surface as a NetworkError - protects against one-off DNS/connection
    blips without masking a genuinely down or rate-limited upstream.

    A rate limit (`YFRateLimitError`, or a generic HTTPError carrying a 429/403 status -
    see `_RATE_LIMIT_STATUS_CODES`) is handled differently: it is *not* retried here
    (retrying immediately into an active rate limit only makes it worse) - instead it
    starts a shared cooldown and raises `RateLimitedError` straight away, so every other
    symbol's poller also backs off instead of piling on.

    Any other exception is inspected for an HTTP status code or a name matching a known
    transient-failure shape (`_UNAVAILABLE_STATUS_CODES` / `_TRANSIENT_ERROR_TYPE_NAMES`)
    before falling back to re-raising it unchanged - this catches real provider trouble
    that neither yfinance nor the builtin exception types above classify consistently
    (e.g. curl_cffi's own timeout/connection exceptions, or a 403/503 from Yahoo), so it
    can never be silently mistaken by a caller for "no data available" instead of "the
    provider is temporarily unavailable".
    """
    settings = get_settings()

    cooldown_remaining = _in_cooldown()
    if cooldown_remaining is not None:
        metrics.increment("rate_limit.provider_cooldown_reject")
        raise RateLimitedError(
            "Market data provider is rate-limiting this server.",
            detail=f"Cooling down for {cooldown_remaining:.0f}s before retrying.",
        )

    attempt = 0
    while True:
        try:
            result = fn()
            _reset_rate_limit_streak()
            return result
        except YFRateLimitError as exc:
            _raise_rate_limited(exc, description)
        except _TRANSIENT_EXCEPTIONS as exc:
            attempt = _retry_or_raise_network_error(exc, attempt, description)
        except Exception as exc:
            status_code = _response_status_code(exc)
            if status_code in _RATE_LIMIT_STATUS_CODES:
                _raise_rate_limited(exc, description, status_code=status_code)
            elif status_code in _UNAVAILABLE_STATUS_CODES or type(exc).__name__ in _TRANSIENT_ERROR_TYPE_NAMES:
                attempt = _retry_or_raise_network_error(exc, attempt, description)
            else:
                # Not a recognized transient/rate-limit signature - leave it to the
                # caller's own handling (e.g. "no analyst coverage for this symbol").
                raise


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
            history = self._cached_quote_fallback_history(symbol)
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
        except YFDataException:
            # yfinance's own signal that this field has no data for this symbol - a
            # normal outcome (crypto, forex, commodities, indices, and many small
            # caps all lack analyst coverage), not a real error.
            targets = {}
        except Exception as exc:
            # Anything else is real provider trouble we don't have a more specific
            # classification for (e.g. a TLS/certificate failure, or some other
            # exception shape _call_with_retry doesn't recognize) - must never be
            # silently treated as "no coverage" the way a bare `except Exception`
            # used to (see _call_with_retry's docstring): that let a real outage or
            # rate limit be misreported as a successful empty result instead of
            # surfacing to the caller, which is exactly the bug this method exists
            # to avoid.
            raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc

        counts = {"strong_buy": 0, "buy": 0, "hold": 0, "sell": 0, "strong_sell": 0}
        try:
            trend = _call_with_retry(
                lambda: ticker.recommendations, description=f"get_analyst_consensus.recommendations({symbol})"
            )
        except (NetworkError, RateLimitedError):
            raise
        except YFDataException:
            trend = None
        except Exception as exc:
            raise NetworkError("Unable to reach the market data source.", detail=str(exc)) from exc

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

    def _cached_quote_fallback_history(self, symbol: str) -> pd.DataFrame:
        """`get_quote`'s fallback when `fast_info` omits price/previous_close (happens for
        some thinly-traded or international symbols) - calling `_safe_history` directly
        here would bypass `price_service`'s caching layer entirely, since this method lives
        below it in the provider, so a symbol that habitually needs this fallback would
        otherwise trigger a fresh, uncached Yahoo call on every quote poll (every ~10s while
        actively watched). Cached here at the same short TTL as a quote closes that gap.
        """
        settings = get_settings()
        key = f"quote_fallback_history:{symbol.upper()}"
        return cache.get_or_set(
            key, settings.quote_cache_ttl_seconds, lambda: self._safe_history(symbol, period="5d", interval="1d")
        )

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

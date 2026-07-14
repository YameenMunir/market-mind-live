from __future__ import annotations

import time
import pytest
import pandas as pd
from typing import Generator

from utils.cache import ThrottlingRateLimiter, cache
from utils.errors import RateLimitedError, NetworkError
from models.schemas import PriceQuote, CandleSeries
import services.price_service as price_service
import data.yfinance_provider as provider_module


@pytest.fixture(autouse=True)
def _reset_cache_and_limiters(monkeypatch) -> Generator[None, None, None]:
    # Clear cache store before every test
    with cache._lock:
        cache._store.clear()
        cache._inflight_locks.clear()

    # Reset price service rate limiters to custom fast settings for tests
    symbol_limiter = ThrottlingRateLimiter(max_per_minute=5, rate_per_second=100.0)
    global_limiter = ThrottlingRateLimiter(max_per_minute=10, rate_per_second=200.0)
    monkeypatch.setattr(price_service, "_rate_limiter", symbol_limiter)
    monkeypatch.setattr(price_service, "_global_rate_limiter", global_limiter)

    # Disable sleeping by mocking time.sleep
    monkeypatch.setattr(time, "sleep", lambda _s: None)
    yield


def test_throttling_rate_limiter_pacing():
    limiter = ThrottlingRateLimiter(max_per_minute=3, rate_per_second=10.0)
    
    # 1. First request allowed immediately
    assert limiter.acquire("TEST_KEY", timeout=1.0) is True

    # 2. Second request pacing interval is 0.1s. Since sleep is mocked, it executes instantly.
    assert limiter.acquire("TEST_KEY", timeout=1.0) is True
    assert limiter.acquire("TEST_KEY", timeout=1.0) is True

    # 4. Fourth request exceeds max_per_minute=3 limit.
    # The oldest hit was now, next slot in 60s. Since 60s > timeout (1.0), it should return False.
    assert limiter.acquire("TEST_KEY", timeout=1.0) is False


def test_throttling_rate_limiter_timeout():
    # If the wait time is within timeout, acquire returns True (sleep is mock-no-op)
    limiter = ThrottlingRateLimiter(max_per_minute=2, rate_per_second=0.5)  # min_interval 2.0s
    
    assert limiter.acquire("TEST_KEY", timeout=5.0) is True
    # Next pacing slot is in 2.0 seconds. 2.0s <= timeout (5.0s), so it should succeed.
    assert limiter.acquire("TEST_KEY", timeout=5.0) is True

    # Next pacing slot is in 2.0 seconds. Timeout is 1.0s. 2s > 1s, so it should return False.
    assert limiter.acquire("TEST_KEY", timeout=1.0) is False


def test_get_quote_stale_fallback(monkeypatch):
    symbol = "AAPL"
    
    # Pre-populate fallback cache with a mock quote
    expected_quote = PriceQuote(
        symbol=symbol,
        price=150.0,
        change=1.5,
        change_percent=1.0,
        previous_close=148.5,
        as_of="2026-07-14T00:00:00Z",
    )
    cache.set(f"quote_fallback:{symbol}", expected_quote, 3600)

    # Mock provider to raise RateLimitedError to simulate rate-limiting
    def mock_get_quote(_symbol):
        raise RateLimitedError("Yahoo rate limit hit.")
    
    monkeypatch.setattr(provider_module.provider, "get_quote", mock_get_quote)

    # Calling get_quote should fall back to the stale cache and set is_stale=True
    res = price_service.get_quote(symbol)
    assert res.price == 150.0
    assert res.is_stale is True


def test_get_quote_propagates_exception_without_fallback(monkeypatch):
    symbol = "MSFT"
    
    def mock_get_quote(_symbol):
        raise NetworkError("Connection refused.")
    
    monkeypatch.setattr(provider_module.provider, "get_quote", mock_get_quote)

    # With no fallback, the network error should propagate
    with pytest.raises(NetworkError):
        price_service.get_quote(symbol)


def test_get_candles_stale_fallback(monkeypatch):
    symbol = "AAPL"
    
    # Pre-populate fallback cache with mock candles
    expected_candles = CandleSeries(
        symbol=symbol,
        range="1d",
        interval="5m",
        market_status="open",
        is_market_open=True,
        last_updated="2026-07-14T00:00:00Z",
        candles=[],
    )
    cache.set(f"candles_fallback:{symbol}:1d", expected_candles, 3600)

    def mock_get_history(*args, **kwargs):
        raise RateLimitedError("Yahoo rate limit hit.")
    
    monkeypatch.setattr(provider_module.provider, "get_history", mock_get_history)

    # Calling get_candles should fall back and set is_stale=True
    res = price_service.get_candles(symbol, "1d")
    assert res.is_stale is True


def test_get_history_df_stale_fallback(monkeypatch):
    symbol = "AAPL"
    
    # Pre-populate fallback cache
    expected_df = pd.DataFrame({"Close": [100.0, 101.0]})
    cache.set(f"history_fallback:{symbol}:1y:1d", expected_df, 3600)

    def mock_get_history(*args, **kwargs):
        raise RateLimitedError("Yahoo rate limit hit.")
    
    monkeypatch.setattr(provider_module.provider, "get_history", mock_get_history)

    # Calling get_history_df should return the stale dataframe
    res = price_service.get_history_df(symbol, "1y", "1d")
    assert len(res) == 2
    assert res["Close"].iloc[0] == 100.0


def test_get_quotes_batch_stale_fallback(monkeypatch):
    symbols = ["AAPL", "MSFT"]
    
    # Cache fallback quote for MSFT but not AAPL
    fallback_quote = PriceQuote(
        symbol="MSFT",
        price=300.0,
        change=3.0,
        change_percent=1.0,
        previous_close=297.0,
        as_of="2026-07-14T00:00:00Z",
    )
    cache.set("quote_fallback:MSFT", fallback_quote, 3600)

    # Mock provider.get_quotes_batch to simulate rate limit exception for both
    def mock_get_quotes_batch(_symbols):
        raise RateLimitedError("Rate limit hit")

    monkeypatch.setattr(provider_module.provider, "get_quotes_batch", mock_get_quotes_batch)

    results = price_service.get_quotes_batch(symbols)
    
    # AAPL has no fallback, so its result remains the exception/error
    assert isinstance(results["AAPL"], Exception)
    # MSFT has fallback, so it falls back to the stale quote
    assert isinstance(results["MSFT"], PriceQuote)
    assert results["MSFT"].price == 300.0
    assert results["MSFT"].is_stale is True

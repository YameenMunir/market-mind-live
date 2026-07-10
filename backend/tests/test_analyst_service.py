"""Covers services/analyst_service.py's error propagation and stale-fallback behavior -
the layer that decides whether the Analyst Consensus endpoint returns a rate_limited
error (frontend shows "Temporarily rate-limited") or silently serves stale data.
"""

from __future__ import annotations

import pytest

import services.analyst_service as analyst_service
from utils.cache import cache
from utils.errors import RateLimitedError

SYMBOL = "TESTCO"


def _raw_consensus(buy: int = 5) -> dict:
    return {
        "strong_buy": 0,
        "buy": buy,
        "hold": 2,
        "sell": 0,
        "strong_sell": 0,
        "price_target_low": 100.0,
        "price_target_high": 200.0,
        "price_target_mean": 150.0,
        "price_target_median": 150.0,
    }


@pytest.fixture(autouse=True)
def _clean_cache():
    """The cache module is a process-wide singleton - scrub this test's keys before
    and after so runs don't interfere with each other."""

    def _clear():
        for key in (f"analyst:{SYMBOL}", f"analyst_fallback:{SYMBOL}"):
            with cache._lock:
                cache._store.pop(key, None)

    _clear()
    yield
    _clear()


@pytest.fixture(autouse=True)
def _noop_rate_limit(monkeypatch):
    # These tests exercise the provider failure path directly, not the app's own
    # proactive self-throttle - keep that check out of the way.
    monkeypatch.setattr(analyst_service, "check_rate_limit", lambda symbol: None)


def test_propagates_rate_limit_when_no_stale_fallback_available(monkeypatch):
    """First-ever request for a symbol, rate-limited before any successful fetch has
    ever populated the stale-fallback cache: this must reach the caller as
    RateLimitedError so the frontend shows "Temporarily rate-limited" - not a blank or
    miscategorized result."""

    def _raise(symbol):
        raise RateLimitedError("rate limited", detail="test")

    monkeypatch.setattr(analyst_service.provider, "get_analyst_consensus", _raise)

    with pytest.raises(RateLimitedError):
        analyst_service.get_analyst_consensus(SYMBOL)


def test_serves_stale_fallback_when_available(monkeypatch):
    # Warm the cache with one successful fetch.
    monkeypatch.setattr(analyst_service.provider, "get_analyst_consensus", lambda symbol: _raw_consensus())
    first = analyst_service.get_analyst_consensus(SYMBOL)
    assert first.is_stale is False

    # Force the "fresh" cache entry to expire while the long-lived fallback survives,
    # and make the next live fetch fail.
    with cache._lock:
        cache._store.pop(f"analyst:{SYMBOL}", None)

    def _raise(symbol):
        raise RateLimitedError("rate limited", detail="test")

    monkeypatch.setattr(analyst_service.provider, "get_analyst_consensus", _raise)

    result = analyst_service.get_analyst_consensus(SYMBOL)
    assert result.is_stale is True
    assert result.total_analysts == first.total_analysts


def test_recovers_with_fresh_data_once_retry_succeeds(monkeypatch):
    """Once a later poll succeeds again, the fallback state must be replaced by real
    data (is_stale back to False) rather than continuing to serve the stale value."""
    monkeypatch.setattr(analyst_service.provider, "get_analyst_consensus", lambda symbol: _raw_consensus(buy=1))
    first = analyst_service.get_analyst_consensus(SYMBOL)
    assert first.is_stale is False

    with cache._lock:
        cache._store.pop(f"analyst:{SYMBOL}", None)

    def _raise(symbol):
        raise RateLimitedError("rate limited", detail="test")

    monkeypatch.setattr(analyst_service.provider, "get_analyst_consensus", _raise)
    stale = analyst_service.get_analyst_consensus(SYMBOL)
    assert stale.is_stale is True

    # The provider recovers on the next poll.
    with cache._lock:
        cache._store.pop(f"analyst:{SYMBOL}", None)
    monkeypatch.setattr(analyst_service.provider, "get_analyst_consensus", lambda symbol: _raw_consensus(buy=9))

    recovered = analyst_service.get_analyst_consensus(SYMBOL)
    assert recovered.is_stale is False
    assert recovered.buy == 9

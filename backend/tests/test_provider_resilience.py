"""Covers the failure classification that feeds the Analyst Consensus card's
"Temporarily rate-limited" fallback: a real 429/403/5xx/timeout from Yahoo must
surface as RateLimitedError/NetworkError, never be silently swallowed into a fake
successful ("no coverage") response - see data/yfinance_provider.py::_call_with_retry.
"""

from __future__ import annotations

import time

import pytest
from yfinance.exceptions import YFDataException, YFRateLimitError

import data.yfinance_provider as provider_module
from config import get_settings
from utils.errors import NetworkError, RateLimitedError


class _FakeResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


class _FakeHTTPError(Exception):
    """Stand-in for curl_cffi/requests' HTTPError - carries a `.response.status_code`
    but is not a subclass of YFRateLimitError, matching what yfinance actually raises
    for a 429 on the first attempt or a soft-block 403/5xx (see data.py's cookie-retry
    logic, which only raises YFRateLimitError for a 429 on the *second* request)."""

    def __init__(self, status_code: int) -> None:
        super().__init__(f"{status_code} Client Error")
        self.response = _FakeResponse(status_code)


class ReadTimeout(Exception):
    """Stand-in for curl_cffi's/requests' own timeout exception class, named to match
    exactly what those libraries actually raise (matched by class name in
    _call_with_retry) - deliberately NOT a subclass of the builtin TimeoutError,
    which is the real-world gap this simulates."""


@pytest.fixture(autouse=True)
def _reset_provider_state(monkeypatch):
    """The rate-limit cooldown is module-level global state shared across every
    symbol's poller in the real app - tests must not leak it between cases."""
    monkeypatch.setattr(provider_module, "_cooldown_until", 0.0)
    monkeypatch.setattr(provider_module, "_consecutive_rate_limit_hits", 0)
    monkeypatch.setattr(provider_module.time, "sleep", lambda _seconds: None)
    settings = get_settings()
    monkeypatch.setattr(settings, "provider_max_retries", 2)
    monkeypatch.setattr(settings, "provider_retry_base_delay_seconds", 0.01)
    yield


def test_success_returns_result_without_retry():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        return "ok"

    assert provider_module._call_with_retry(fn, description="test") == "ok"
    assert calls["n"] == 1


def test_yf_rate_limit_error_raises_rate_limited_and_starts_cooldown():
    def fn():
        raise YFRateLimitError()

    with pytest.raises(RateLimitedError):
        provider_module._call_with_retry(fn, description="test")

    # A second call must short-circuit into the cooldown without hitting `fn` again -
    # every other symbol's poller should back off too, not just this one.
    calls = {"n": 0}

    def fn2():
        calls["n"] += 1
        return "should not run"

    with pytest.raises(RateLimitedError):
        provider_module._call_with_retry(fn2, description="test2")
    assert calls["n"] == 0


def test_generic_429_http_error_raises_rate_limited():
    """Regression test: before the fix, an HTTPError that isn't YFRateLimitError
    (what Yahoo actually returns for a 429 on the first attempt) fell through to the
    caller's bare `except Exception`, silently masquerading as a normal outcome."""

    def fn():
        raise _FakeHTTPError(429)

    with pytest.raises(RateLimitedError):
        provider_module._call_with_retry(fn, description="test")


def test_generic_403_soft_block_raises_rate_limited():
    """Yahoo commonly soft-blocks shared/cloud IPs (e.g. Render) with a 403 instead of
    a clean 429 - this must be treated the same as a rate limit, not as "no data"."""

    def fn():
        raise _FakeHTTPError(403)

    with pytest.raises(RateLimitedError):
        provider_module._call_with_retry(fn, description="test")


def test_503_retries_then_raises_network_error_after_max_retries():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise _FakeHTTPError(503)

    with pytest.raises(NetworkError):
        provider_module._call_with_retry(fn, description="test")

    assert calls["n"] == get_settings().provider_max_retries + 1


def test_backend_specific_timeout_retries_then_raises_network_error():
    """A timeout exception from curl_cffi/requests is not an instance of the builtin
    TimeoutError, so it must be matched by class name rather than isinstance."""
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise ReadTimeout("timed out")

    with pytest.raises(NetworkError):
        provider_module._call_with_retry(fn, description="test")

    assert calls["n"] == get_settings().provider_max_retries + 1


def test_transient_failure_then_success_recovers_without_raising():
    """The fallback state must clear as soon as a retry succeeds - not stay failed
    until the whole retry budget is exhausted."""
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] == 1:
            raise ReadTimeout("timed out")
        return "recovered"

    assert provider_module._call_with_retry(fn, description="test") == "recovered"
    assert calls["n"] == 2


def test_unrecognized_exception_propagates_unchanged():
    """A genuinely unrelated failure (e.g. a missing key while parsing a normal
    response) must not be reclassified as a rate limit/network error - only
    provider-trouble shapes should be caught here."""

    def fn():
        raise KeyError("not a provider failure")

    with pytest.raises(KeyError):
        provider_module._call_with_retry(fn, description="test")


def test_get_analyst_consensus_propagates_rate_limit_instead_of_fake_empty_result(monkeypatch):
    """End-to-end regression test for the reported bug: a rate-limited/blocked Yahoo
    response for the analyst-data calls must surface as RateLimitedError, not as a
    successful empty ("no coverage") AnalystConsensus."""

    class _FakeTicker:
        @property
        def analyst_price_targets(self):
            raise _FakeHTTPError(429)

        @property
        def recommendations(self):
            raise _FakeHTTPError(429)

    monkeypatch.setattr(provider_module.yf, "Ticker", lambda symbol: _FakeTicker())

    with pytest.raises(RateLimitedError):
        provider_module.provider.get_analyst_consensus("AAPL")


def test_get_analyst_consensus_treats_genuine_yf_data_exception_as_no_coverage(monkeypatch):
    """A symbol yfinance itself reports has no data for a field (YFDataException -
    its own convention, confirmed in yfinance/scrapers/quote.py and analysis.py) must
    still resolve to an empty/not-covered result, not an error - this is the
    legitimate "normal, not a failure" case the broad `except Exception` used to
    (over-)protect, now narrowed to just this."""

    class _FakeTicker:
        @property
        def analyst_price_targets(self):
            raise YFDataException("no analyst data")

        @property
        def recommendations(self):
            raise YFDataException("no analyst data")

    monkeypatch.setattr(provider_module.yf, "Ticker", lambda symbol: _FakeTicker())

    result = provider_module.provider.get_analyst_consensus("SOMEETF")
    assert result == {
        "price_target_low": None,
        "price_target_high": None,
        "price_target_mean": None,
        "price_target_median": None,
        "strong_buy": 0,
        "buy": 0,
        "hold": 0,
        "sell": 0,
        "strong_sell": 0,
    }


def test_get_analyst_consensus_raises_network_error_for_unrecognized_exception(monkeypatch):
    """Regression test for a real failure hit during manual verification: yfinance's
    HTTP backend (curl_cffi) can raise its own exception types (e.g. a TLS/certificate
    failure) that are neither YFRateLimitError, a named transient type, nor
    YFDataException. These must surface as NetworkError - never be silently
    swallowed into a fake "no coverage" result the way a bare `except Exception`
    used to."""

    class _CertificateVerifyError(Exception):
        pass

    class _FakeTicker:
        @property
        def analyst_price_targets(self):
            raise _CertificateVerifyError("SSL certificate problem")

        @property
        def recommendations(self):
            raise _CertificateVerifyError("SSL certificate problem")

    monkeypatch.setattr(provider_module.yf, "Ticker", lambda symbol: _FakeTicker())

    with pytest.raises(NetworkError):
        provider_module.provider.get_analyst_consensus("AAPL")

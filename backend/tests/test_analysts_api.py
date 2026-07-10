"""End-to-end check of the actual HTTP contract the frontend depends on: a
rate-limited/unavailable provider must reach the client as the documented
error_code/status_code pair (utils/errors.py), not a 200 with misleading data.
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

import api.analysts as analysts_router
import main
import services.price_service as price_service
from utils.errors import NetworkError, RateLimitedError

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def _no_real_network(monkeypatch):
    # api/analysts.py also calls price_service.get_quote() just to label the
    # response's currency - stub it out so these tests never hit the real network.
    monkeypatch.setattr(
        price_service, "get_quote", lambda symbol: type("Q", (), {"currency": "USD"})()
    )


def test_rate_limited_provider_returns_429_rate_limited(monkeypatch):
    def _raise(symbol, currency="USD"):
        raise RateLimitedError(
            "Market data provider is rate-limiting this server.",
            detail="Cooling down for 15s before retrying.",
        )

    monkeypatch.setattr(analysts_router.analyst_service, "get_analyst_consensus", _raise)

    resp = client.get("/api/analysts/AAPL")

    assert resp.status_code == 429
    body = resp.json()
    assert body["error_code"] == "rate_limited"
    assert "message" in body


def test_unavailable_provider_returns_503_network_error(monkeypatch):
    def _raise(symbol, currency="USD"):
        raise NetworkError("Unable to reach the market data source.", detail="timed out")

    monkeypatch.setattr(analysts_router.analyst_service, "get_analyst_consensus", _raise)

    resp = client.get("/api/analysts/AAPL")

    assert resp.status_code == 503
    assert resp.json()["error_code"] == "network_error"


def test_successful_response_returns_200_with_consensus(monkeypatch):
    def _fake(symbol, currency="USD"):
        from models.schemas import AnalystConsensus, AnalystRating

        return AnalystConsensus(
            symbol=symbol.upper(),
            rating=AnalystRating.BUY,
            total_analysts=5,
            strong_buy=1,
            buy=3,
            hold=1,
            sell=0,
            strong_sell=0,
            currency=currency,
            as_of="2026-07-10T00:00:00+00:00",
        )

    monkeypatch.setattr(analysts_router.analyst_service, "get_analyst_consensus", _fake)

    resp = client.get("/api/analysts/AAPL")

    assert resp.status_code == 200
    body = resp.json()
    assert body["rating"] == "buy"
    assert body["is_stale"] is False

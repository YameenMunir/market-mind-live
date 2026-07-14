"""Covers the post-hoc numeric grounding check (services/grounding_check.py) and its
wiring into ai_insights_service's Gemini-path handlers: a reply's numeric claims are
checked against the context/knowledge-base data actually available to the model, and
mock-provider replies (grounded by construction) skip the check entirely.
"""

from __future__ import annotations

import asyncio

import services.ai_insights_service as ai_insights_service
from models.schemas import (
    AIAssetContext,
    AIPredictionContext,
    AIRiskContext,
    AITechnicalContext,
    ChatRequest,
    PredictionDirection,
    RiskLevel,
)
from services.grounding_check import find_ungrounded_numbers
from services.knowledge_base import ARTICLES


def _context() -> AIAssetContext:
    return AIAssetContext(
        asset="AAPL",
        asset_name="Apple Inc.",
        latest_price=209.97,
        price_change=1.23,
        price_change_percent=0.59,
        technical_indicators=AITechnicalContext(
            rsi=55.2,
            macd_trend="bullish",
            moving_average_trend="above the 50-period average",
            volatility="medium",
            bollinger_position="mid-range between the bands",
        ),
        prediction=AIPredictionContext(
            signal="buy",
            forecast_direction=PredictionDirection.BULLISH,
            confidence=62.0,
            model_name="rule-based technical ensemble",
            horizon="1-3 days",
            target_price=215.50,
            explanation="Momentum favors continuation.",
            reasoning=["RSI at 55.2 signals room to run."],
        ),
        risk=AIRiskContext(
            level=RiskLevel.MEDIUM,
            score=41.0,
            volatility_annualized_pct=28.3,
            max_drawdown_pct=-12.4,
            reasons=["Elevated volatility versus sector peers."],
        ),
    )


def test_find_ungrounded_numbers_passes_replies_that_only_cite_real_data():
    kb = [a for a in ARTICLES if a.id == "rsi"]  # cites "70" (overbought threshold)
    reply = (
        "AAPL is at $209.97, up 0.59% today. RSI is 55, comfortably under the 70 "
        "overbought line, with 62% model confidence and a $215.50 target."
    )
    assert find_ungrounded_numbers(_context(), kb, reply) == []


def test_find_ungrounded_numbers_flags_invented_figures():
    reply = "AAPL trades at a P/E of 34.2 and could reach $260.00 by next quarter, with 91% confidence."
    offenders = find_ungrounded_numbers(_context(), [], reply)
    assert offenders == ["34.2", "$260.00", "91%"]


def test_find_ungrounded_numbers_ignores_ordinary_prose_numbers():
    reply = "Here are 2-3 factors to watch: 1. momentum, 2. volatility, 3. news flow."
    assert find_ungrounded_numbers(_context(), [], reply) == []


def test_find_ungrounded_numbers_tolerates_reasonable_rounding():
    # $209.97 rounded to the nearest dollar, 62.0% confidence rounded to the nearest
    # whole percent (already whole here, but exercises the tolerance path at 0).
    reply = "AAPL is near $210 with about 62% confidence."
    assert find_ungrounded_numbers(_context(), [], reply) == []


class _AlwaysAllowLimiter:
    def check(self, key):
        return True


class _NoopChatStore:
    def get_history(self, session_id, limit=None):
        return []

    def append(self, session_id, message):
        pass

    def touch(self, session_id, **kwargs):
        pass


async def _fake_resolve_context(asset, client_context) -> AIAssetContext:
    return _context()


async def _collect(agen) -> list[dict]:
    return [event async for event in agen]


async def _fake_stream_reply_with_hallucination(**kwargs):
    for piece in ["AAPL's P/E ratio of ", "34.2 suggests it could reach ", "$260.00 soon."]:
        yield piece


async def _fake_stream_reply_grounded(**kwargs):
    for piece in ["AAPL is near ", "$210 with ", "62% confidence."]:
        yield piece


def test_handle_chat_stream_flags_gemini_reply_with_invented_figures(monkeypatch):
    monkeypatch.setattr(ai_insights_service, "chat_store", _NoopChatStore())
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysAllowLimiter())
    monkeypatch.setattr(ai_insights_service, "resolve_context", _fake_resolve_context)
    monkeypatch.setattr(ai_insights_service, "_resolve_gemini_api_key", lambda device_id, settings: "fake-key")
    monkeypatch.setattr(ai_insights_service.gemini_service, "stream_reply", _fake_stream_reply_with_hallucination)

    request = ChatRequest(session_id="sess-1", message="Should I buy?", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_chat_stream(request, "device-1")))

    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    assert done_events[0]["provider"] == "gemini"
    assert done_events[0]["unverified_figures"] is True


def test_handle_chat_stream_does_not_flag_grounded_gemini_reply(monkeypatch):
    monkeypatch.setattr(ai_insights_service, "chat_store", _NoopChatStore())
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysAllowLimiter())
    monkeypatch.setattr(ai_insights_service, "resolve_context", _fake_resolve_context)
    monkeypatch.setattr(ai_insights_service, "_resolve_gemini_api_key", lambda device_id, settings: "fake-key")
    monkeypatch.setattr(ai_insights_service.gemini_service, "stream_reply", _fake_stream_reply_grounded)

    request = ChatRequest(session_id="sess-2", message="Where's it trading?", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_chat_stream(request, "device-1")))

    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    assert done_events[0]["provider"] == "gemini"
    assert done_events[0]["unverified_figures"] is False


def test_handle_chat_stream_skips_grounding_check_for_mock_provider(monkeypatch):
    """A mock reply is built directly from context's own values, so even a mock
    reply that happens to contain a number absent from context (unlikely in
    practice, but not something this check should ever need to evaluate) must not
    be flagged - only genuinely model-generated replies go through the check."""
    monkeypatch.setattr(ai_insights_service, "chat_store", _NoopChatStore())
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysAllowLimiter())
    monkeypatch.setattr(ai_insights_service, "resolve_context", _fake_resolve_context)
    monkeypatch.setattr(ai_insights_service, "_resolve_gemini_api_key", lambda device_id, settings: None)
    monkeypatch.setattr(
        ai_insights_service.mock_ai_provider,
        "generate_mock_reply",
        lambda context, message, history: "Totally invented figure: $999.99 target.",
    )

    request = ChatRequest(session_id="sess-3", message="Should I buy?", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_chat_stream(request, "device-1")))

    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    assert done_events[0]["provider"] == "mock"
    assert done_events[0]["unverified_figures"] is False

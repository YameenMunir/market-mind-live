"""Covers the AI Insights Assistant's COMPARE-intent comparison feature:

- Extracting a second symbol from free text (ticker match, name/alias match, live
  lookup for tickers outside the curated directory, and the false-positive/self-
  exclusion guards) - services/ai_insights_service.py's
  `_extract_comparison_symbol_fast` / `_extract_comparison_symbol`.
- Building a real, grounded snapshot for that second asset -
  `_build_comparison_context`, including graceful degradation when the fetch fails.
- Wiring it into the system prompt - `_build_system_instruction` attaches
  `context.comparison` only for COMPARE-intent messages with a resolvable symbol.
- The mock provider's COMPARE reply using real comparison numbers when available,
  and falling back to the previous generic text when not.

No real network/yfinance calls - `lookup_symbol` and `context_builder.build_asset_context`
are monkeypatched throughout.
"""

from __future__ import annotations

import asyncio

import pytest

import services.ai_insights_service as ai_insights_service
from services import mock_ai_provider
from models.schemas import (
    AIAssetContext,
    AIComparisonAssetContext,
    AIPredictionContext,
    AIRiskContext,
    AITechnicalContext,
    PredictionDirection,
    RiskLevel,
)


def _base_context(asset: str = "AAPL", asset_name: str = "Apple Inc.") -> AIAssetContext:
    return AIAssetContext(
        asset=asset,
        asset_name=asset_name,
        latest_price=200.0,
        price_change=1.5,
        price_change_percent=0.75,
        technical_indicators=AITechnicalContext(
            rsi=61.8, macd_trend="bullish", moving_average_trend="above both the 50- and 200-period averages (uptrend)"
        ),
        prediction=AIPredictionContext(
            signal="buy", forecast_direction=PredictionDirection.BULLISH, confidence=83.0, explanation="test"
        ),
        risk=AIRiskContext(level=RiskLevel.MEDIUM, score=36.0, volatility_annualized_pct=24.09),
    )


def _full_context_for(symbol: str, name: str) -> AIAssetContext:
    """Stands in for context_builder.build_asset_context's return value."""
    return AIAssetContext(
        asset=symbol,
        asset_name=name,
        latest_price=387.36,
        price_change=-2.34,
        price_change_percent=-0.60,
        technical_indicators=AITechnicalContext(rsi=48.8, macd_trend="bullish"),
        prediction=AIPredictionContext(
            signal="sell", forecast_direction=PredictionDirection.BEARISH, confidence=61.0, explanation="test"
        ),
        risk=AIRiskContext(level=RiskLevel.MEDIUM, score=40.0, volatility_annualized_pct=27.21),
        news=[{"title": "Headline 1", "publisher": None, "published_at": None, "summary": None}],
    )


# ---------------------------------------------------------------------------
# Symbol extraction
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "message,exclude,expected",
    [
        ("compare AAPL to MSFT", "AAPL", "MSFT"),
        ("compare to msft please", "AAPL", "MSFT"),  # curated-directory match is case-insensitive
        ("how does this stack up against Microsoft?", "AAPL", "MSFT"),  # name alias
        ("what about the S&P 500 compared to this", "AAPL", "^GSPC"),
        ("compare to gold", "AAPL", "GC=F"),
        ("compare bitcoin to ethereum", "BTC-USD", "ETH-USD"),
        ("should I buy more of this", "AAPL", None),  # no comparison target at all
        ("compare AAPL to AAPL", "AAPL", None),  # self-comparison excluded
        ("is AI going to help with RSI here", "AAPL", None),  # acronym false-positive guard
    ],
)
def test_extract_comparison_symbol_fast(message, exclude, expected):
    assert ai_insights_service._extract_comparison_symbol_fast(message, exclude) == expected


def test_extract_comparison_symbol_skips_live_lookup_when_fast_path_hits(monkeypatch):
    """A curated-directory or alias match must short-circuit before ever touching
    the network - asserted by making the live lookup blow up if it's called."""

    def _boom(symbol):
        raise AssertionError("live lookup should not have been called")

    monkeypatch.setattr(ai_insights_service, "lookup_symbol", _boom)

    result = asyncio.run(ai_insights_service._extract_comparison_symbol("compare AAPL to MSFT", "AAPL"))
    assert result == "MSFT"


def test_extract_comparison_symbol_falls_back_to_live_lookup_outside_curated_directory(monkeypatch):
    """A ticker not in the curated directory (e.g. a recent IPO) should still
    resolve via the same live lookup the asset search box uses."""
    monkeypatch.setattr(
        ai_insights_service, "lookup_symbol", lambda symbol: {"symbol": "COIN", "name": "Coinbase Global"}
    )

    result = asyncio.run(ai_insights_service._extract_comparison_symbol("AAPL vs COIN, which is better", "AAPL"))
    assert result == "COIN"


def test_extract_comparison_symbol_survives_live_lookup_failure(monkeypatch):
    """Regression test: an exception from the live lookup (network error, SSL
    failure, rate limit, ...) must degrade to "no comparison found", never
    propagate and take down the whole chat reply this is only enriching."""

    def _raise(symbol):
        raise RuntimeError("simulated network failure")

    monkeypatch.setattr(ai_insights_service, "lookup_symbol", _raise)

    result = asyncio.run(ai_insights_service._extract_comparison_symbol("AAPL vs COIN, which is better", "AAPL"))
    assert result is None


def test_extract_comparison_symbol_rejects_live_lookup_matching_excluded_symbol(monkeypatch):
    monkeypatch.setattr(ai_insights_service, "lookup_symbol", lambda symbol: {"symbol": "AAPL", "name": "Apple Inc."})

    result = asyncio.run(ai_insights_service._extract_comparison_symbol("AAPL vs AAPL2, thoughts?", "AAPL"))
    assert result is None


# ---------------------------------------------------------------------------
# Comparison context building
# ---------------------------------------------------------------------------


def test_build_comparison_context_trims_full_context(monkeypatch):
    monkeypatch.setattr(
        ai_insights_service.context_builder,
        "build_asset_context",
        lambda symbol: _full_context_for(symbol, "Microsoft Corporation"),
    )

    result = asyncio.run(ai_insights_service._build_comparison_context("MSFT"))

    assert isinstance(result, AIComparisonAssetContext)
    assert result.asset == "MSFT"
    assert result.asset_name == "Microsoft Corporation"
    assert result.latest_price == 387.36
    assert result.prediction.signal == "sell"
    assert result.risk.score == 40.0
    assert len(result.news) <= 2


def test_build_comparison_context_returns_none_on_fetch_failure(monkeypatch):
    def _raise(symbol):
        raise RuntimeError("simulated fetch failure")

    monkeypatch.setattr(ai_insights_service.context_builder, "build_asset_context", _raise)

    result = asyncio.run(ai_insights_service._build_comparison_context("MSFT"))
    assert result is None


# ---------------------------------------------------------------------------
# System instruction wiring
# ---------------------------------------------------------------------------


def test_build_system_instruction_attaches_comparison_for_compare_intent(monkeypatch):
    monkeypatch.setattr(
        ai_insights_service.context_builder,
        "build_asset_context",
        lambda symbol: _full_context_for(symbol, "Microsoft Corporation"),
    )

    instruction, augmented = asyncio.run(
        ai_insights_service._build_system_instruction(_base_context(), "compare AAPL to MSFT", [])
    )

    assert augmented.comparison is not None
    assert augmented.comparison.asset == "MSFT"
    assert "comparison" in instruction
    assert "MSFT" in instruction


def test_build_system_instruction_notes_missing_data_when_comparison_unresolvable(monkeypatch):
    def _raise(symbol):
        raise RuntimeError("simulated fetch failure")

    monkeypatch.setattr(ai_insights_service.context_builder, "build_asset_context", _raise)

    instruction, augmented = asyncio.run(
        ai_insights_service._build_system_instruction(_base_context(), "compare AAPL to MSFT", [])
    )

    assert augmented.comparison is None
    assert any("Comparison data" in note for note in augmented.missing_data)


def test_build_system_instruction_skips_comparison_work_for_non_compare_intent(monkeypatch):
    def _boom(message, exclude_symbol):
        raise AssertionError("comparison extraction should not run for a non-COMPARE intent")

    monkeypatch.setattr(ai_insights_service, "_extract_comparison_symbol", _boom)

    instruction, augmented = asyncio.run(
        ai_insights_service._build_system_instruction(_base_context(), "should I buy more of this", [])
    )

    assert augmented.comparison is None
    assert "comparison" not in instruction.lower().split("structured application context")[0]


def test_build_system_instruction_does_not_refetch_existing_comparison(monkeypatch):
    def _boom(message, exclude_symbol):
        raise AssertionError("should not re-extract when context.comparison is already set")

    monkeypatch.setattr(ai_insights_service, "_extract_comparison_symbol", _boom)

    context = _base_context().model_copy(
        update={
            "comparison": AIComparisonAssetContext(asset="MSFT", asset_name="Microsoft Corporation", latest_price=387.36)
        }
    )
    instruction, augmented = asyncio.run(
        ai_insights_service._build_system_instruction(context, "compare AAPL to MSFT", [])
    )

    assert augmented.comparison.asset == "MSFT"


# ---------------------------------------------------------------------------
# Mock provider output
# ---------------------------------------------------------------------------


def test_mock_reply_uses_real_numbers_when_comparison_available():
    context = _base_context().model_copy(
        update={
            "comparison": AIComparisonAssetContext(
                asset="MSFT",
                asset_name="Microsoft Corporation",
                latest_price=387.36,
                price_change_percent=-0.60,
                technical_indicators=AITechnicalContext(rsi=48.8, macd_trend="bullish"),
                prediction=AIPredictionContext(
                    signal="sell", forecast_direction=PredictionDirection.BEARISH, confidence=61.0, explanation="t"
                ),
                risk=AIRiskContext(level=RiskLevel.MEDIUM, score=40.0, volatility_annualized_pct=27.21),
            )
        }
    )

    reply = mock_ai_provider.generate_mock_reply(context, "compare AAPL to MSFT", [])

    assert "MSFT" in reply
    assert "387.36" in reply
    assert "SELL" in reply
    assert "61%" in reply
    assert "peer assets" not in reply  # the old generic filler must not appear
    assert "  " not in reply  # no stray double spaces


def test_mock_reply_falls_back_to_generic_text_without_comparison():
    context = _base_context()  # comparison is None

    reply = mock_ai_provider.generate_mock_reply(context, "compare this to its peers", [])

    assert "peer assets" in reply
    assert "  " not in reply

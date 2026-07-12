"""Deterministic local fallback for the AI Insights Assistant.

Used automatically when `GEMINI_API_KEY` is not configured (local development) and as
a graceful degrade path if a live Gemini call fails. Answers are grounded in the same
`AIAssetContext` a real Gemini call would receive, with light keyword-based intent
routing so it responds sensibly to the app's common question categories rather than
returning one generic template every time.
"""

from __future__ import annotations

from models.schemas import AIAssetContext, ChatMessage

DISCLAIMER = "This is for informational purposes only and is not financial advice."


def _fmt_pct(value: float | None) -> str:
    return f"{value:.2f}%" if value is not None else "unavailable"


def _fmt_price(value: float | None) -> str:
    return f"{value:,.4f}" if value is not None else "unavailable"


def _intent(message: str) -> str:
    m = message.lower()
    if any(k in m for k in ("risk", "drawdown", "volatil")):
        return "risk"
    if any(k in m for k in ("confiden", "uncertain", "sure")):
        return "confidence"
    if any(k in m for k in ("backtest", "win rate", "sharpe", "reliable", "reliability")):
        return "backtest"
    if any(k in m for k in ("compare", "versus", " vs ", "other asset")):
        return "compare"
    if any(k in m for k in ("beginner", "simple", "explain like", "eli5")):
        return "beginner"
    # Checked before "signal" - "upgraded to buy" would otherwise match "buy" first.
    if any(k in m for k in ("upgrade", "downgrade", "rating change", "analyst action")):
        return "rating_changes"
    if any(k in m for k in ("signal", "buy", "sell", "hold", "should i")):
        return "signal"
    if any(k in m for k in ("indicator", "rsi", "macd", "bollinger", "moving average", "sma", "ema")):
        return "indicators"
    if any(k in m for k in ("news", "headline", "article", "press")):
        return "news"
    if any(k in m for k in ("chart", "trend", "suggest")):
        return "chart"
    return "general"


def _asset_label(context: AIAssetContext) -> str:
    return f"{context.asset_name} ({context.asset})" if context.asset_name else context.asset


def _missing_note(context: AIAssetContext) -> str:
    if not context.missing_data:
        return ""
    return "\n\nNote: " + " ".join(context.missing_data)


def generate_mock_reply(context: AIAssetContext, message: str, history: list[ChatMessage]) -> str:
    intent = _intent(message)
    asset = _asset_label(context)
    lines: list[str] = []

    if intent == "risk" and context.risk:
        lines.append(
            f"{asset} currently shows **{context.risk.level.value} risk** (score {context.risk.score:.0f}/100), "
            f"based on {_fmt_pct(context.risk.volatility_annualized_pct)} annualized volatility and a "
            f"{_fmt_pct(context.risk.max_drawdown_pct)} maximum drawdown over the lookback window."
        )
        if context.risk.reasons:
            lines.append("Contributing factors: " + "; ".join(context.risk.reasons))
        lines.append("Higher risk means larger expected price swings in either direction, not just downside.")

    elif intent == "confidence" and context.prediction:
        lines.append(
            f"The model's confidence for {asset} is **{context.prediction.confidence:.0f}%**, which reflects how "
            "strongly the underlying trend, momentum, and volatility signals agree with each other - "
            "it is not a statistical probability that the forecast will be correct."
        )
        lines.append(
            "Confidence in the 50-65% range means signals are only loosely aligned; above 80% means most "
            "signals point the same way. Treat any single prediction as one input, not a certainty."
        )

    elif intent == "backtest":
        if context.backtesting and context.backtesting.available:
            bt = context.backtesting
            lines.append(
                f"The backtest for {asset} over {bt.lookback_days or '?'} days produced a "
                f"{_fmt_pct(bt.win_rate_pct)} win rate across {bt.total_trades or 0} trades, with a "
                f"maximum drawdown of {_fmt_pct(bt.max_drawdown_pct)}."
            )
            trade_count = bt.total_trades or 0
            if trade_count < 10:
                lines.append(
                    f"With only {trade_count} trades, this result has low statistical significance - "
                    "treat it as a rough signal, not a reliable performance estimate."
                )
            else:
                lines.append("This trade count gives a moderately more reliable read than a handful of trades would.")
        else:
            lines.append(
                f"No backtest has been run for {asset} in this session yet. Run one from the Backtesting "
                "page to see win rate, drawdown, and trade count before judging how reliable this "
                "strategy has been historically."
            )

    elif intent == "compare":
        lines.append(
            f"I can only see live data for {asset} right now - open the other asset on the dashboard "
            "(or ask about it by name) and I can compare their risk, trend, and prediction side by side."
        )

    elif intent == "beginner":
        lines.append(f"In simple terms for {asset}:")
        if context.prediction:
            direction_word = {"bullish": "up", "bearish": "down", "neutral": "sideways"}.get(
                context.prediction.forecast_direction.value, "sideways"
            )
            lines.append(
                f"- The model currently leans toward prices moving **{direction_word}**, "
                f"with {context.prediction.confidence:.0f}% of its internal signals agreeing."
            )
        if context.risk:
            lines.append(f"- Risk is rated **{context.risk.level.value}**, meaning price could swing "
                          f"{'a lot' if context.risk.level.value in ('high', 'extreme') else 'a moderate amount'} "
                          "in either direction.")
        lines.append("- None of this guarantees an outcome - it's a read of current conditions, not a forecast you can rely on.")

    elif intent == "signal" and context.prediction:
        lines.append(
            f"The current model signal for {asset} is **{context.prediction.signal.upper()}** "
            f"(confidence {context.prediction.confidence:.0f}%)."
        )
        if context.prediction.reasoning:
            lines.append("Reasons: " + " ".join(context.prediction.reasoning))
        lines.append(
            "This is a probabilistic read from the current indicator mix, not an instruction to trade - "
            "consider your own risk tolerance and position sizing."
        )

    elif intent == "indicators" and context.technical_indicators:
        ti = context.technical_indicators
        parts = []
        if ti.rsi is not None:
            parts.append(f"RSI is at {ti.rsi:.1f}")
        if ti.macd_trend:
            parts.append(f"MACD momentum is {ti.macd_trend}")
        if ti.moving_average_trend:
            parts.append(f"price is {ti.moving_average_trend}")
        if ti.bollinger_position:
            parts.append(f"price is {ti.bollinger_position}")
        lines.append(f"For {asset}: " + "; ".join(parts) + "." if parts else "Indicator data is limited right now.")

    elif intent == "rating_changes":
        if context.rating_changes:
            lines.append(f"Recent analyst rating changes for {asset}:")
            for change in context.rating_changes[:3]:
                grade_move = (
                    f"{change.from_grade} → {change.to_grade}"
                    if change.from_grade and change.to_grade
                    else change.to_grade or change.from_grade or "rating updated"
                )
                lines.append(f"- {change.firm}: {grade_move} ({change.action.value}) on {change.graded_at[:10]}")
            lines.append(
                "A single firm's move isn't the whole picture - check the overall analyst consensus "
                "(buy/hold/sell breakdown) for the aggregate view."
            )
        else:
            lines.append(f"I don't have any recent analyst rating changes on record for {asset}.")

    elif intent == "news":
        if context.news:
            lines.append(f"Recent headlines for {asset}:")
            for item in context.news[:3]:
                publisher = f" ({item.publisher})" if item.publisher else ""
                lines.append(f"- {item.title}{publisher}")
            lines.append(
                "Headlines are qualitative context, not a trading signal by themselves - "
                "pair them with the technical/risk picture before drawing a conclusion."
            )
        else:
            lines.append(f"I don't have any recent news headlines available for {asset} right now.")

    elif intent == "chart":
        if context.prediction and context.technical_indicators:
            lines.append(
                f"Taken together, {asset}'s chart currently favors a "
                f"**{context.prediction.forecast_direction.value}** read: "
                f"{context.prediction.explanation}"
            )
        else:
            lines.append(f"I don't have enough live chart data for {asset} to characterize the trend right now.")

    else:
        lines.append(f"Here's a quick read on {asset}:")
        if context.latest_price is not None:
            change = context.price_change_percent
            direction = "up" if (change or 0) >= 0 else "down"
            lines.append(
                f"- Trading at {_fmt_price(context.latest_price)}, {direction} "
                f"{_fmt_pct(abs(change) if change is not None else None)} on the session."
            )
        if context.prediction:
            lines.append(
                f"- Model signal: **{context.prediction.signal.upper()}** "
                f"({context.prediction.confidence:.0f}% confidence)."
            )
        if context.risk:
            lines.append(f"- Risk level: **{context.risk.level.value}** ({context.risk.score:.0f}/100).")
        lines.append("Ask me about the risk score, prediction reasoning, indicators, or backtest results for more detail.")

    if context.data_is_delayed:
        lines.append("\nNote: prices shown are delayed, not real-time exchange data.")

    lines.append(_missing_note(context))
    lines.append(f"\n_{DISCLAIMER}_")

    return "\n".join(line for line in lines if line)

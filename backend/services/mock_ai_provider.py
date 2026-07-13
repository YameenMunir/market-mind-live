"""Deterministic local fallback for the AI Insights Assistant.

Used automatically when `GEMINI_API_KEY` is not configured (local development) and as
a graceful degrade path if a live Gemini call fails. Answers are grounded in the same
`AIAssetContext` a real Gemini call would receive, utilizing the modular ReasoningEngine
for intent and portfolio context routing.
"""

from __future__ import annotations

from models.schemas import AIAssetContext, ChatMessage
from services.reasoning_engine import reasoning_engine

DISCLAIMER = "This is for informational purposes only and is not financial advice."


def _fmt_pct(value: float | None) -> str:
    return f"{value:.2f}%" if value is not None else "N/A"


def _fmt_price(value: float | None) -> str:
    return f"{value:,.2f}" if value is not None else "N/A"


def _asset_label(context: AIAssetContext) -> str:
    return f"{context.asset_name} ({context.asset})" if context.asset_name else context.asset


def generate_mock_reply(context: AIAssetContext, message: str, history: list[ChatMessage]) -> str:
    has_portfolio = reasoning_engine.detect_portfolio_context(history, message)
    intent = reasoning_engine.detect_intent(message)
    asset_lbl = _asset_label(context)
    
    # Extract dynamic parameters
    price_val = _fmt_price(context.latest_price)
    change_val = _fmt_pct(context.price_change_percent)
    signal = context.prediction.signal.upper() if context.prediction else "HOLD"
    confidence = f"{context.prediction.confidence:.0f}%" if context.prediction else "70%"
    target = _fmt_price(context.prediction.target_price) if context.prediction and context.prediction.target_price else "N/A"
    
    rsi = context.technical_indicators.rsi if context.technical_indicators else None
    macd = context.technical_indicators.macd_trend if context.technical_indicators else None
    ma_trend = context.technical_indicators.moving_average_trend if context.technical_indicators else None
    bollinger = context.technical_indicators.bollinger_position if context.technical_indicators else None
    
    risk_level = context.risk.level.value if context.risk else "medium"
    risk_score = f"{context.risk.score:.0f}/100" if context.risk else "50/100"
    vol = _fmt_pct(context.risk.volatility_annualized_pct) if context.risk else "N/A"
    drawdown = _fmt_pct(context.risk.max_drawdown_pct) if context.risk else "N/A"

    lines: list[str] = []

    if intent == "BUY":
        if has_portfolio:
            lines.append(f"Since you already hold a position in {asset_lbl}, adding shares at the current price of ${price_val} should be approached as a strategic portfolio sizing decision.")
            lines.append(f"**Reasoning**: With the overall model displaying a **{signal}** signal at {confidence} confidence, the macro-trend remains constructive. RSI at {f'{rsi:.1f}' if rsi else 'N/A'} indicates active momentum without being extremely overbought. Adding here increases your average cost basis, so doing so in small tranches on brief support test pullbacks is historically a safer strategy than a lump-sum add.")
        else:
            lines.append(f"Based on current market parameters, entering a fresh position in {asset_lbl} at ${price_val} is supported by a **{signal}** model layout with {confidence} confidence.")
            lines.append(f"**Reasoning**: Price is currently {ma_trend or 'stabilizing'}. The MACD is exhibiting {macd or 'neutral'} momentum, while the RSI sits at {f'{rsi:.1f}' if rsi else 'N/A'}. This configuration suggests that structural buyers are in control, though near-term resistance {f'({bollinger})' if bollinger else ''} warrants a controlled entry.")
        
        lines.append("\n**Bullish Factors**:")
        lines.append(f"- Trend: Price is currently {ma_trend or 'above short-term support'}.")
        lines.append(f"- Momentum: MACD shows a {macd or 'stable'} profile, suggesting underlying buying pressure.")
        if context.prediction and context.prediction.reasoning:
            lines.append(f"- Model insight: {context.prediction.reasoning[0] if len(context.prediction.reasoning) > 0 else 'Technical alignment'}")

        lines.append("\n**Bearish Factors**:")
        if bollinger:
            lines.append(f"- Overhead resistance: Price is {bollinger}, limiting immediate upside headroom.")
        lines.append("- Concentration: High-momentum assets carry volatility risks that can spike concentration exposure.")

        lines.append("\n**Key Risks**:")
        lines.append(f"- Technical pullback: Annualized volatility is {vol}, showing potential for sudden mean-reversion swings.")
        if context.risk and context.risk.reasons:
            lines.append(f"- Risk drivers: {'; '.join(context.risk.reasons[:2])}")

        lines.append(f"\n**Model Confidence**: {confidence} based on indicator alignment.")
        
        lines.append("\n**Actionable Scenarios**:")
        lines.append(f"- **Bull Scenario**: If price breaks overhead resistance and heads toward target ${target}, momentum will accelerate. Watch for volume confirmation.")
        lines.append(f"- **Bear Scenario**: If support fails, expect consolidation down to structural supports. A gradual accumulation (buying in tranches) near support offers the best risk/reward ratio.")
        
        lines.append("\n**Balanced Conclusion**:")
        lines.append("On balance, current setups favor buyer accumulation, but position sizing must remain conservative to shield against sudden volatility shifts.")

    elif intent == "SELL":
        if has_portfolio:
            lines.append(f"If you are holding {asset_lbl} in your portfolio, managing your exit or taking profits at ${price_val} should focus on protecting your accumulated gains.")
            lines.append(f"**Reasoning**: The model is currently flashing a **{signal}** signal at {confidence} confidence. With price currently {ma_trend or 'in a steady path'}, immediate trend breakdown is not confirmed. However, if the position has become over-concentrated, scaling out in structured tranches is a highly disciplined portfolio rule rather than attempting to time a absolute top.")
        else:
            lines.append(f"For traders looking to exit a position in {asset_lbl} at ${price_val}, the current signal is **{signal}** at {confidence} confidence, suggesting patience is warranted.")
            lines.append(f"**Reasoning**: Technical momentum is {macd or 'mixed'} and RSI is at {f'{rsi:.1f}' if rsi else 'N/A'}. Bollinger Band placement indicates price is {bollinger or 'mid-range'}, meaning a panic exit is unnecessary, but key support levels should be closely monitored.")

        lines.append("\n**Bullish Factors**:")
        lines.append(f"- Broad Trend: Price is {ma_trend or 'well-supported'}.")
        if context.prediction and context.prediction.reasoning:
            lines.append(f"- Strategic alignment: {context.prediction.reasoning[0]}")

        lines.append("\n**Bearish Factors**:")
        lines.append("- Profit-taking pressure: Reaching potential psychological barriers and resistance bands.")
        if rsi and rsi > 70:
            lines.append(f"- Overbought condition: RSI is elevated at {rsi:.1f}, indicating short-term exhaustion risk.")

        lines.append("\n**Key Risks**:")
        lines.append(f"- Trend failure: A breach below major moving averages would accelerate liquidations. Drawdown risk is {drawdown}.")
        if context.risk and context.risk.reasons:
            lines.append(f"- Tail risk: {context.risk.reasons[0]}")

        lines.append(f"\n**Model Confidence**: {confidence}")

        lines.append("\n**Actionable Scenarios**:")
        lines.append("- **Profit Taking**: Set a trailing stop-loss (e.g. 5-7%) below recent support to protect gains while leaving room for upside.")
        lines.append("- **Position Hold**: If momentum remains intact, hold until trend deterioration signs appear (MACD bearish cross or support breach).")

        lines.append("\n**Balanced Conclusion**:")
        lines.append("While the core uptrend remains active, trimming a portion of the position to secure gains aligns with sound risk management rules.")

    elif intent == "HOLD":
        lines.append(f"Maintaining a hold stance on {asset_lbl} at ${price_val} is structurally supported by the current **{signal}** signal at {confidence} confidence.")
        lines.append(f"**Reasoning**: Price action is {ma_trend or 'trading in a stable band'} with RSI at {f'{rsi:.1f}' if rsi else 'N/A'}. As long as key support levels hold and MACD momentum remains {macd or 'stable'}, there is no clear technical trigger to force a premature exit or liquidate shares.")
        
        lines.append("\n**Bullish Factors**:")
        lines.append(f"- Support: Price is {ma_trend or 'above long-term trendlines'}.")
        if context.prediction and context.prediction.reasoning:
            lines.append(f"- Catalyst: {context.prediction.reasoning[0]}")

        lines.append("\n**Bearish Factors**:")
        lines.append("- Opportunity cost: Capital remains tied up in an asset that might consolidate near resistance.")
        if bollinger:
            lines.append(f"- Range bound: Price is currently {bollinger}, indicating limited momentum spikes.")

        lines.append("\n**Key Risks**:")
        lines.append(f"- Volatility test: Annualized volatility is {vol}, exposing holders to moderate swings.")

        lines.append(f"\n**Model Confidence**: {confidence}")

        lines.append("\n**Actionable Scenarios**:")
        lines.append("- **Hold Support**: Maintain full exposure as long as price remains above major moving averages.")
        lines.append("- **Rebalancing trigger**: Prepare to trim or hedge if key support fails or volatility breaches historic norms.")

        lines.append("\n**Balanced Conclusion**:")
        lines.append("Holding remains the most logical action to capture residual upside while keeping drawdown exposure controlled.")

    elif intent == "RISK":
        lines.append(f"Analyzing {asset_lbl}'s risk profile indicates a **{risk_level.upper()} RISK** rating, carrying a score of {risk_score}.")
        lines.append(f"**Reasoning**: Risk assessment is primarily driven by an annualized volatility of {vol} and a maximum historical drawdown of {drawdown}. The current trend is {ma_trend or 'developing'}, meaning position sizing should adapt to expected swings.")

        lines.append("\n**Bullish Risk Mitigation**:")
        lines.append(f"- Trend cushion: Price is {ma_trend or 'above major support channels'}, offering structural downside protection.")
        if context.prediction:
            lines.append(f"- Model backing: Prediction has a {confidence} confidence rating.")

        lines.append("\n**Bearish Risk Factors**:")
        if context.risk and context.risk.reasons:
            for r in context.risk.reasons[:2]:
                lines.append(f"- Catalyst: {r}")
        lines.append(f"- Volatility swings: Average True Range (ATR) indicates standard session ranges are wide.")

        lines.append("\n**Key Downside Risks**:")
        lines.append(f"- Drawdown projection: Historical records show drawdown potential of up to {drawdown} under adverse regimes.")

        lines.append(f"\n**Model Confidence**: {confidence}")

        lines.append("\n**Actionable Scenarios**:")
        lines.append("- **Conservative Play**: Use tighter stop-losses or decrease initial capital allocation to limit downside.")
        lines.append("- **Hedging**: Couple the position with inverse sector assets or options protection if concentration is high.")

        lines.append("\n**Balanced Conclusion**:")
        lines.append("Risk levels are elevated but not unmanageable; successful execution hinges on strict adherence to capital allocation limits.")

    elif intent == "LONG_TERM":
        lines.append(f"For long-term investors (5+ year outlook), {asset_lbl} trading at ${price_val} presents a structurally stable opportunity backed by a **{signal}** signal.")
        lines.append(f"**Reasoning**: Over a multi-year horizon, short-term indicator noise is secondary to fundamental moats and major averages. Currently, price is {ma_trend or 'in a long-term uptrend'}, showing strong long-term structural demand.")

        lines.append("\n**Bullish Factors (Long Term)**:")
        if context.rating_changes:
            lines.append(f"- Institutional trust: Recent analyst consensus is positive, with firms like {context.rating_changes[0].firm} active.")
        lines.append("- Strategic growth: Positioned in key growth sectors with solid competitive advantages.")

        lines.append("\n**Bearish Factors (Long Term)**:")
        lines.append("- Valuation headwind: Elevated multiples may require earnings growth to catch up.")
        lines.append(f"- Volatility spikes: Over a 5-year period, the historical {drawdown} max drawdown may repeat.")

        lines.append("\n**Key Risks**:")
        lines.append(f"- Secular shifts: Rapid technological changes or sector re-ratings are the main long-term tail risks.")

        lines.append(f"\n**Model Confidence**: {confidence} based on structural alignment.")

        lines.append("\n**Actionable Scenarios**:")
        lines.append("- **Dollar-Cost Average (DCA)**: Accumulate shares at regular monthly or quarterly intervals to smooth out short-term fluctuations.")
        lines.append("- **Long Term Hold**: Maintain the core position, re-evaluating only if competitive moats or secular growth parameters change.")

        lines.append("\n**Balanced Conclusion**:")
        lines.append("The long-term outlook remains highly constructive, making this a suitable core holdings candidate for growth portfolios.")

    elif intent == "WHY_MOVING":
        direction_word = "up" if (context.price_change_percent or 0) >= 0 else "down"
        lines.append(f"The recent price movement of {asset_lbl} (trading at ${price_val}, {direction_word} {change_val} on the session) is driven by a combination of sentiment shifts and technical indicators.")
        lines.append(f"**Reasoning**: The price action is currently {ma_trend or 'highly active'}. MACD is {macd or 'developing'} and RSI is at {f'{rsi:.1f}' if rsi else 'N/A'}. This is further corroborated by recent news headlines and analyst rating updates.")

        if context.news:
            lines.append("\n**Key Catalysts from News Headlines**:")
            for item in context.news[:2]:
                lines.append(f"- {item.title} ({item.publisher or 'Media'})")
        
        if context.rating_changes:
            lines.append("\n**Analyst Actions**:")
            for change in context.rating_changes[:2]:
                lines.append(f"- {change.firm}: {change.action.value} rating (target adjustment/grade shift)")

        lines.append("\n**Technical Factors**:")
        lines.append(f"- Volatility response: Annualized volatility is {vol}, indicating the market is pricing in structural shifts.")

        lines.append(f"\n**Model Confidence**: {confidence}")

        lines.append("\n**Actionable Scenarios**:")
        lines.append("- **Momentum follow**: If news catalysts hold, expect momentum to push toward target resistances.")
        lines.append("- **Mean reversion**: Watch for signs of volume drying up, which could trigger profit-taking pullbacks.")

        lines.append("\n**Balanced Conclusion**:")
        lines.append("The current move is backed by volume and news flow, suggesting continuation is probable in the short term, but caution near resistance is advised.")

    elif intent == "COMPARE":
        lines.append(f"Comparing {asset_lbl} at ${price_val} against peer assets reveals relative strength and risk metrics.")
        lines.append(f"**Reasoning**: {asset_lbl} is displaying a **{signal}** signal with {confidence} confidence and a {risk_level} risk score. Peer comparisons should evaluate volatility ({vol}) and consensus ratings to assess relative value.")

        lines.append("\n**Relative Strengths**:")
        lines.append(f"- {asset_lbl} has a model signal of {signal} with {confidence} confidence.")
        lines.append(f"- Technical posture: Price is {ma_trend or 'stabilizing'}.")

        lines.append("\n**Relative Risks**:")
        lines.append(f"- Peering volatility stands at {vol} with a max drawdown of {drawdown}.")

        lines.append(f"\n**Model Confidence**: {confidence}")

        lines.append("\n**Actionable Scenarios**:")
        lines.append("- **Relative trade**: Allocate capital to the asset with higher model confidence and lower relative risk.")
        lines.append("- **Diversification**: Split allocation between both to balance structural risk across the sector.")

        lines.append("\n**Balanced Conclusion**:")
        lines.append(f"{asset_lbl} remains a strong relative choice under current technical configurations.")

    else:
        lines.append(f"Here is a professional market analyst's summary for {asset_lbl} trading at ${price_val} ({change_val} today).")
        lines.append(f"**Reasoning**: The overall technical posture is **{signal}** at {confidence} model confidence. With price currently {ma_trend or 'in consolidation'}, the momentum profile shows MACD is {macd or 'flat'} and RSI is at {f'{rsi:.1f}' if rsi else 'N/A'}.")

        lines.append("\n**Bullish Factors**:")
        lines.append(f"- Trend structure: Price is {ma_trend or 'above critical averages'}.")
        if context.prediction and context.prediction.reasoning:
            lines.append(f"- Supporting factors: {context.prediction.reasoning[0]}")

        lines.append("\n**Bearish Factors**:")
        lines.append(f"- Volatility index: Annualized volatility is {vol} with a history of {drawdown} drawdown swings.")

        lines.append("\n**Key Risks**:")
        lines.append(f"- Volatility and market regime shifts are the dominant factors. Risk level is {risk_level} (score {risk_score}).")

        lines.append(f"\n**Model Confidence**: {confidence}")

        lines.append("\n**Actionable Scenarios**:")
        lines.append(f"- **Bull Scenario**: A push above immediate resistance targets ${target}.")
        lines.append("- **Bear Scenario**: A support failure triggers consolidation. DCA (dollar-cost averaging) offers the safest path.")

        lines.append("\n**Balanced Conclusion**:")
        lines.append("The current data outlines a constructive outlook, but position control remains key in this market regime.")

    if context.data_is_delayed:
        lines.append("\nNote: prices shown are delayed, not real-time exchange data.")

    if context.missing_data:
        lines.append("\nNote: " + " ".join(context.missing_data))

    lines.append(f"\n_{DISCLAIMER}_")

    return "\n".join(line for line in lines if line)

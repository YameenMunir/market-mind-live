from __future__ import annotations

from datetime import datetime, timezone

from models.schemas import IndicatorSet, PredictionDirection, PredictionResult

DIRECTION_LABEL = {
    PredictionDirection.BULLISH: "upward",
    PredictionDirection.BEARISH: "downward",
    PredictionDirection.NEUTRAL: "sideways",
}


def _score_trend(price: float, indicators: IndicatorSet) -> tuple[float, list[str]]:
    reasons = []
    score = 0.0
    ma = indicators.moving_averages

    if ma.sma_20 and ma.sma_50:
        if ma.sma_20 > ma.sma_50:
            score += 0.35
            reasons.append("Short-term trend (SMA 20) is above the medium-term trend (SMA 50), a bullish signal.")
        else:
            score -= 0.35
            reasons.append("Short-term trend (SMA 20) is below the medium-term trend (SMA 50), a bearish signal.")

    if ma.sma_200 and price:
        if price > ma.sma_200:
            score += 0.2
            reasons.append("Price is trading above its 200-period average, indicating a longer-term uptrend.")
        else:
            score -= 0.2
            reasons.append("Price is trading below its 200-period average, indicating a longer-term downtrend.")

    return score, reasons


def _score_momentum(indicators: IndicatorSet) -> tuple[float, list[str]]:
    reasons = []
    score = 0.0

    if indicators.rsi_14 is not None:
        if indicators.rsi_14 >= 70:
            score -= 0.25
            reasons.append(f"RSI is at {indicators.rsi_14:.1f}, suggesting overbought conditions.")
        elif indicators.rsi_14 <= 30:
            score += 0.25
            reasons.append(f"RSI is at {indicators.rsi_14:.1f}, suggesting oversold conditions.")
        else:
            reasons.append(f"RSI is at {indicators.rsi_14:.1f}, in a neutral range.")

    macd = indicators.macd
    if macd.histogram is not None:
        if macd.histogram > 0:
            score += 0.2
            reasons.append("MACD histogram is positive, indicating bullish momentum.")
        else:
            score -= 0.2
            reasons.append("MACD histogram is negative, indicating bearish momentum.")

    return score, reasons


def _score_volatility_position(price: float, indicators: IndicatorSet) -> tuple[float, list[str]]:
    reasons = []
    score = 0.0
    bb = indicators.bollinger_bands

    if bb.upper and bb.lower and price:
        band_width = bb.upper - bb.lower
        if band_width > 0:
            position = (price - bb.lower) / band_width
            if position >= 0.85:
                score -= 0.15
                reasons.append("Price is near the upper Bollinger Band, which can precede a pullback.")
            elif position <= 0.15:
                score += 0.15
                reasons.append("Price is near the lower Bollinger Band, which can precede a bounce.")

    return score, reasons


def generate_prediction(symbol: str, price: float, indicators: IndicatorSet) -> PredictionResult:
    trend_score, trend_reasons = _score_trend(price, indicators)
    momentum_score, momentum_reasons = _score_momentum(indicators)
    volatility_score, volatility_reasons = _score_volatility_position(price, indicators)

    total_score = trend_score + momentum_score + volatility_score
    reasoning = trend_reasons + momentum_reasons + volatility_reasons

    if total_score > 0.15:
        direction = PredictionDirection.BULLISH
    elif total_score < -0.15:
        direction = PredictionDirection.BEARISH
    else:
        direction = PredictionDirection.NEUTRAL

    confidence = round(min(95.0, 50 + abs(total_score) * 55), 1)

    target_price = None
    if indicators.atr_14 and direction != PredictionDirection.NEUTRAL:
        move = indicators.atr_14 * 1.5
        target_price = round(price + move if direction == PredictionDirection.BULLISH else price - move, 4)

    beginner_summary = _build_beginner_summary(symbol, direction, confidence)
    plain_english = _build_plain_english_explanation(direction, reasoning)

    return PredictionResult(
        symbol=symbol.upper(),
        direction=direction,
        confidence=confidence,
        target_price=target_price,
        reasoning=reasoning,
        beginner_summary=beginner_summary,
        plain_english_explanation=plain_english,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _build_beginner_summary(symbol: str, direction: PredictionDirection, confidence: float) -> str:
    label = DIRECTION_LABEL[direction]
    if direction == PredictionDirection.NEUTRAL:
        return (
            f"{symbol.upper()} doesn't show a strong signal in either direction right now. "
            "It may be best to wait for a clearer trend before acting."
        )
    return (
        f"Based on current trend and momentum signals, {symbol.upper()} is showing signs of {label} movement "
        f"with {confidence:.0f}% model confidence. This is not financial advice - always do your own research."
    )


def _build_plain_english_explanation(direction: PredictionDirection, reasoning: list[str]) -> str:
    intro = {
        PredictionDirection.BULLISH: "Several indicators are pointing up:",
        PredictionDirection.BEARISH: "Several indicators are pointing down:",
        PredictionDirection.NEUTRAL: "Indicators are mixed or inconclusive:",
    }[direction]
    bullet_points = " ".join(reasoning) if reasoning else "Not enough historical data was available to form strong signals."
    return f"{intro} {bullet_points}"

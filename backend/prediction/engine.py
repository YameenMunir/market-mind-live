from __future__ import annotations

from datetime import datetime, timezone

from models.schemas import AssetType, IndicatorSet, PredictionDirection, PredictionResult, RiskAssessment

DIRECTION_LABEL = {
    PredictionDirection.BULLISH: "upward",
    PredictionDirection.BEARISH: "downward",
    PredictionDirection.NEUTRAL: "sideways",
}

# How each asset class refers to its "price" in plain English, so the same sentence
# template doesn't read oddly for a currency pair or an index level.
PRICE_NOUN = {
    AssetType.STOCK: "share price",
    AssetType.ETF: "share price",
    AssetType.CRYPTO: "price",
    AssetType.FOREX: "exchange rate",
    AssetType.COMMODITY: "futures price",
    AssetType.INDEX: "index level",
}


def _score_trend(price: float, indicators: IndicatorSet) -> tuple[float, list[str], list[str]]:
    reasons: list[str] = []
    data_notes: list[str] = []
    score = 0.0
    ma = indicators.moving_averages

    if ma.sma_20 and ma.sma_50:
        if ma.sma_20 > ma.sma_50:
            score += 0.35
            reasons.append("Short-term trend (SMA 20) is above the medium-term trend (SMA 50), a bullish signal.")
        else:
            score -= 0.35
            reasons.append("Short-term trend (SMA 20) is below the medium-term trend (SMA 50), a bearish signal.")
    else:
        data_notes.append("Not enough history yet to compare the 20- and 50-period trend.")

    if ma.sma_200 and price:
        if price > ma.sma_200:
            score += 0.2
            reasons.append("Price is trading above its 200-period average, indicating a longer-term uptrend.")
        else:
            score -= 0.2
            reasons.append("Price is trading below its 200-period average, indicating a longer-term downtrend.")
    else:
        data_notes.append("Not enough history yet to establish the longer-term (200-period) trend.")

    return score, reasons, data_notes


def _score_momentum(indicators: IndicatorSet) -> tuple[float, list[str], list[str]]:
    reasons: list[str] = []
    data_notes: list[str] = []
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
    else:
        data_notes.append("RSI could not be calculated from the available history.")

    macd = indicators.macd
    if macd.histogram is not None:
        if macd.histogram > 0:
            score += 0.2
            reasons.append("MACD histogram is positive, indicating bullish momentum.")
        else:
            score -= 0.2
            reasons.append("MACD histogram is negative, indicating bearish momentum.")
    else:
        data_notes.append("MACD could not be calculated from the available history.")

    return score, reasons, data_notes


def _score_volatility_position(price: float, indicators: IndicatorSet) -> tuple[float, list[str], list[str]]:
    reasons: list[str] = []
    data_notes: list[str] = []
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
    else:
        data_notes.append("Bollinger Bands could not be calculated from the available history.")

    return score, reasons, data_notes


def _score_support_resistance(price: float, indicators: IndicatorSet) -> tuple[float, list[str], list[str]]:
    """Scores proximity to the nearest recent swing-high/low pivots (compute_support_resistance),
    a factor distinct from _score_volatility_position's Bollinger read - one is a statistical
    volatility band, the other is actual historical price levels where reversals occurred.
    "Near" is defined relative to ATR (half a day's typical range) rather than a fixed percentage,
    consistent with how target_price already sizes moves off ATR."""
    reasons: list[str] = []
    data_notes: list[str] = []
    score = 0.0
    sr = indicators.support_resistance

    if not sr.support and not sr.resistance:
        data_notes.append("Not enough recent price history to identify support/resistance levels.")
        return score, reasons, data_notes

    if not indicators.atr_14:
        data_notes.append("ATR unavailable, so proximity to support/resistance levels could not be judged.")
        return score, reasons, data_notes

    threshold = indicators.atr_14 * 0.5

    resistance_above = [r for r in sr.resistance if r > price]
    if resistance_above:
        nearest_resistance = min(resistance_above)
        if nearest_resistance - price <= threshold:
            score -= 0.15
            reasons.append(
                f"Price is close to a recent resistance level near {nearest_resistance:.2f}, "
                "which may cap near-term upside."
            )

    support_below = [s for s in sr.support if s < price]
    if support_below:
        nearest_support = max(support_below)
        if price - nearest_support <= threshold:
            score += 0.15
            reasons.append(
                f"Price is close to a recent support level near {nearest_support:.2f}, "
                "which may limit near-term downside."
            )

    return score, reasons, data_notes


def generate_prediction(
    symbol: str,
    price: float,
    indicators: IndicatorSet,
    *,
    asset_name: str | None = None,
    asset_type: AssetType | None = None,
    price_change_percent: float | None = None,
    risk: RiskAssessment | None = None,
    market_is_open: bool | None = None,
) -> PredictionResult:
    trend_score, trend_reasons, trend_notes = _score_trend(price, indicators)
    momentum_score, momentum_reasons, momentum_notes = _score_momentum(indicators)
    volatility_score, volatility_reasons, volatility_notes = _score_volatility_position(price, indicators)
    sr_score, sr_reasons, sr_notes = _score_support_resistance(price, indicators)

    total_score = trend_score + momentum_score + volatility_score + sr_score
    reasoning = trend_reasons + momentum_reasons + volatility_reasons + sr_reasons
    data_notes = trend_notes + momentum_notes + volatility_notes + sr_notes

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

    agreement = _signal_agreement([trend_score, momentum_score, volatility_score, sr_score])

    label = symbol.upper()
    display_name = f"{asset_name} ({label})" if asset_name and asset_name.upper() != label else label
    price_noun = PRICE_NOUN.get(asset_type, "price") if asset_type else "price"

    beginner_summary = _build_beginner_summary(
        display_name=display_name,
        price_noun=price_noun,
        direction=direction,
        confidence=confidence,
        risk=risk,
        price_change_percent=price_change_percent,
        market_is_open=market_is_open,
        agreement=agreement,
    )
    plain_english = _build_plain_english_explanation(
        display_name=display_name,
        direction=direction,
        reasoning=reasoning,
        data_notes=data_notes,
        agreement=agreement,
        risk=risk,
    )

    return PredictionResult(
        symbol=label,
        direction=direction,
        confidence=confidence,
        target_price=target_price,
        reasoning=reasoning + data_notes,
        beginner_summary=beginner_summary,
        plain_english_explanation=plain_english,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _signal_agreement(scores: list[float]) -> str:
    """Classifies how strongly the signal groups agree with each other, so the
    explanation can call out mixed/contradictory readings explicitly instead of
    silently averaging them into one confidence number."""
    signs = [s for s in scores if abs(s) > 1e-9]
    if len(signs) <= 1:
        return "weak" if not signs else "strong"
    positive = sum(1 for s in signs if s > 0)
    negative = sum(1 for s in signs if s < 0)
    if positive and negative:
        return "mixed"
    return "strong" if abs(sum(signs)) >= 0.4 else "weak"


def _build_beginner_summary(
    *,
    display_name: str,
    price_noun: str,
    direction: PredictionDirection,
    confidence: float,
    risk: RiskAssessment | None,
    price_change_percent: float | None,
    market_is_open: bool | None,
    agreement: str,
) -> str:
    label = DIRECTION_LABEL[direction]
    sentences: list[str] = []

    if direction == PredictionDirection.NEUTRAL:
        sentences.append(
            f"{display_name} doesn't show a strong signal in either direction right now - "
            "its indicators are roughly balanced, so it may be best to wait for a clearer trend before acting."
        )
    else:
        confidence_word = "confident" if confidence >= 70 else "moderately confident" if confidence >= 55 else "not very confident"
        sentences.append(
            f"{display_name} is currently showing signs of {label} movement in its {price_noun}, "
            f"and the model is {confidence_word} ({confidence:.0f}%)."
        )

    if agreement == "mixed":
        sentences.append("Not every signal agrees, though - some point one way and some the other, so treat this read with extra caution.")

    if price_change_percent is not None:
        move_word = "up" if price_change_percent >= 0 else "down"
        sentences.append(f"It's {move_word} {abs(price_change_percent):.2f}% over the current session.")

    if risk is not None:
        risk_word = {"low": "low", "medium": "moderate", "high": "high", "extreme": "very high"}.get(risk.risk_level.value, risk.risk_level.value)
        sentences.append(f"Risk is currently rated {risk_word}, so size any decision accordingly.")

    if market_is_open is False:
        sentences.append("The market for this asset is currently closed, so this reflects the most recent completed session.")

    sentences.append("This is not financial advice - always do your own research.")
    return " ".join(sentences)


def _build_plain_english_explanation(
    *,
    display_name: str,
    direction: PredictionDirection,
    reasoning: list[str],
    data_notes: list[str],
    agreement: str,
    risk: RiskAssessment | None,
) -> str:
    intro = {
        PredictionDirection.BULLISH: f"Several indicators for {display_name} are pointing up:",
        PredictionDirection.BEARISH: f"Several indicators for {display_name} are pointing down:",
        PredictionDirection.NEUTRAL: f"Indicators for {display_name} are mixed or inconclusive:",
    }[direction]

    parts = [intro]
    parts.append(" ".join(reasoning) if reasoning else "Not enough historical data was available to form strong signals.")

    if agreement == "mixed":
        parts.append(
            "Signals disagree with each other here - trend, momentum, volatility positioning, and "
            "support/resistance proximity aren't all pointing the same way, which is why confidence is "
            "limited despite a directional call being made."
        )

    if risk is not None and risk.factors:
        parts.append("On risk: " + " ".join(risk.factors))

    if data_notes:
        parts.append("Data limitations: " + " ".join(data_notes))

    return " ".join(parts)

"""Builds the structured `AIAssetContext` the AI assistant is grounded in.

Pulls from the same services the REST/WebSocket API already uses (price, indicators,
prediction, risk, market status) so the assistant's view of an asset matches what a
user sees on the dashboard. Any section that fails to load is recorded in
`missing_data` instead of raising, so the assistant can still respond and explicitly
tell the user what information is unavailable rather than silently guessing.
"""

from __future__ import annotations

from datetime import datetime, timezone

from models.schemas import (
    AIAssetContext,
    AINewsItem,
    AIPredictionContext,
    AIRiskContext,
    AITechnicalContext,
    PredictionDirection,
    RatingChange,
)
from prediction.engine import generate_prediction
from prediction.history_store import history_store
from services import news_service, price_service, rating_change_service
from services.asset_service import resolve_asset_metadata
from services.indicator_service import compute_indicators
from services.market_status_service import get_market_status
from services.risk_service import compute_risk
from utils.errors import AppError


def signal_from_prediction(direction: PredictionDirection, confidence: float) -> str:
    if direction == PredictionDirection.BULLISH:
        return "buy" if confidence >= 60 else "hold"
    if direction == PredictionDirection.BEARISH:
        return "sell" if confidence >= 60 else "hold"
    return "hold"


def _bollinger_position(price: float | None, upper: float | None, lower: float | None) -> str | None:
    if price is None or upper is None or lower is None or upper <= lower:
        return None
    position = (price - lower) / (upper - lower)
    if position >= 0.85:
        return "near the upper band"
    if position <= 0.15:
        return "near the lower band"
    return "mid-range between the bands"


def _ma_trend(price: float | None, sma_50: float | None, sma_200: float | None) -> str | None:
    if price is None:
        return None
    if sma_50 is not None and sma_200 is not None:
        if price > sma_50 and price > sma_200:
            return "above both the 50- and 200-period averages (uptrend)"
        if price < sma_50 and price < sma_200:
            return "below both the 50- and 200-period averages (downtrend)"
        return "mixed versus its 50- and 200-period averages"
    if sma_50 is not None:
        return "above the 50-period average" if price > sma_50 else "below the 50-period average"
    return None


def build_asset_context(symbol: str) -> AIAssetContext:
    symbol = symbol.upper()
    missing: list[str] = []

    metadata = resolve_asset_metadata(symbol)
    asset_name = metadata["name"] if metadata else None

    quote = None
    try:
        quote = price_service.get_quote(symbol)
    except AppError as exc:
        missing.append(f"Live quote unavailable: {exc.message}")

    market_status = None
    try:
        market_status = get_market_status(symbol, metadata["asset_type"] if metadata else None)
    except AppError as exc:
        missing.append(f"Market status unavailable: {exc.message}")

    technical: AITechnicalContext | None = None
    prediction_ctx: AIPredictionContext | None = None
    risk_ctx: AIRiskContext | None = None
    try:
        df = price_service.get_history_df(symbol, period="1y", interval="1d")
        indicators = compute_indicators(symbol, df)
        price = float(df["Close"].iloc[-1])

        macd_trend = None
        if indicators.macd.histogram is not None:
            macd_trend = "bullish" if indicators.macd.histogram > 0 else "bearish"

        risk = compute_risk(symbol, df)
        technical = AITechnicalContext(
            rsi=indicators.rsi_14,
            macd_trend=macd_trend,
            moving_average_trend=_ma_trend(price, indicators.moving_averages.sma_50, indicators.moving_averages.sma_200),
            volatility=risk.risk_level.value,
            bollinger_position=_bollinger_position(
                price, indicators.bollinger_bands.upper, indicators.bollinger_bands.lower
            ),
        )
        risk_ctx = AIRiskContext(
            level=risk.risk_level,
            score=risk.risk_score,
            volatility_annualized_pct=risk.volatility_annualized_pct,
            max_drawdown_pct=risk.max_drawdown_pct,
            reasons=risk.factors,
        )

        prediction = generate_prediction(
            symbol,
            price,
            indicators,
            asset_name=asset_name,
            asset_type=metadata["asset_type"] if metadata else None,
            price_change_percent=quote.change_percent if quote else None,
            risk=risk,
            market_is_open=market_status.is_open if market_status else None,
        )
        history_store.record(prediction, price)
        prediction_ctx = AIPredictionContext(
            signal=signal_from_prediction(prediction.direction, prediction.confidence),
            forecast_direction=prediction.direction,
            confidence=prediction.confidence,
            horizon=prediction.horizon,
            target_price=prediction.target_price,
            explanation=prediction.plain_english_explanation,
            reasoning=prediction.reasoning,
        )
    except AppError as exc:
        missing.append(f"Technical indicators/prediction/risk unavailable: {exc.message}")

    # An empty result is a normal outcome (many symbols simply have no recent news) and
    # is not recorded in missing_data - only an actual fetch failure is.
    news_items: list[AINewsItem] = []
    try:
        news_feed = news_service.get_news(symbol, count=5)
        news_items = [
            AINewsItem(
                title=article.title,
                publisher=article.publisher,
                published_at=article.published_at,
                summary=article.summary,
            )
            for article in news_feed.articles
        ]
    except AppError as exc:
        missing.append(f"News headlines unavailable: {exc.message}")

    # Same "empty is normal, only a fetch failure goes in missing_data" rule as news.
    rating_changes: list[RatingChange] = []
    try:
        rating_feed = rating_change_service.get_rating_changes(symbol, count=3)
        rating_changes = rating_feed.changes
    except AppError as exc:
        missing.append(f"Analyst rating changes unavailable: {exc.message}")

    history_count = len(history_store.get_history(symbol))

    return AIAssetContext(
        asset=symbol,
        asset_name=asset_name,
        latest_price=quote.price if quote else None,
        price_change=quote.change if quote else None,
        price_change_percent=quote.change_percent if quote else None,
        timeframe="1D",
        market_status=market_status.session.value if market_status else None,
        is_market_open=market_status.is_open if market_status else None,
        last_updated=datetime.now(timezone.utc).isoformat(),
        data_is_delayed=quote.is_delayed if quote else True,
        technical_indicators=technical,
        prediction=prediction_ctx,
        risk=risk_ctx,
        backtesting=None,
        news=news_items,
        rating_changes=rating_changes,
        prediction_history_count=history_count,
        missing_data=missing,
    )

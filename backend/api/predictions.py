from __future__ import annotations

import logging

from fastapi import APIRouter

from config import get_settings
from models.schemas import PredictionHistoryEntry, PredictionResult, PriceForecast
from prediction.engine import generate_prediction
from prediction.history_store import history_store
from services import price_service
from services.asset_service import resolve_asset_metadata
from services.indicator_service import compute_indicators
from services.market_status_service import get_market_status
from services.prediction_service import ALLOWED_HORIZONS, generate_price_forecast
from services.risk_service import compute_risk
from utils.cache import cache
from utils.errors import AppError, ValidationError

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/{symbol}", response_model=PredictionResult)
def get_prediction(symbol: str):
    df = price_service.get_history_df(symbol, period="1y", interval="1d")
    indicators = compute_indicators(symbol, df)
    price = float(df["Close"].iloc[-1])
    risk = compute_risk(symbol, df)

    metadata = resolve_asset_metadata(symbol)
    quote = None
    try:
        quote = price_service.get_quote(symbol)
    except AppError:
        pass  # Quote is a nice-to-have for richer wording - prediction still works without it.
    market_status = get_market_status(symbol, metadata["asset_type"] if metadata else None)

    prediction = generate_prediction(
        symbol,
        price,
        indicators,
        asset_name=metadata["name"] if metadata else None,
        asset_type=metadata["asset_type"] if metadata else None,
        price_change_percent=quote.change_percent if quote else None,
        risk=risk,
        market_is_open=market_status.is_open,
    )
    history_store.record(prediction, price)
    return prediction


@router.get("/{symbol}/history", response_model=list[PredictionHistoryEntry])
def get_prediction_history(symbol: str):
    return history_store.get_history(symbol)


@router.get("/{symbol}/forecast", response_model=PriceForecast)
def get_price_forecast(symbol: str, horizon_days: int = 7):
    if horizon_days not in ALLOWED_HORIZONS:
        raise ValidationError(
            f"horizon_days must be one of {list(ALLOWED_HORIZONS)}.",
            detail=f"Received {horizon_days}.",
        )

    def _build() -> PriceForecast:
        logger.info("Building forecast for symbol=%s horizon_days=%d", symbol.upper(), horizon_days)
        df = price_service.get_history_df(symbol, period="2y", interval="1d")
        indicators = compute_indicators(symbol, df)
        price = float(df["Close"].iloc[-1])
        risk = compute_risk(symbol, df)

        metadata = resolve_asset_metadata(symbol)
        asset_type = metadata["asset_type"] if metadata else None
        market_status = get_market_status(symbol, asset_type)

        quote = None
        try:
            quote = price_service.get_quote(symbol)
        except AppError:
            pass  # Same "nice-to-have" pattern as get_prediction() above - forecast still works without it.

        rule_prediction = generate_prediction(
            symbol,
            price,
            indicators,
            asset_name=metadata["name"] if metadata else None,
            asset_type=asset_type,
            price_change_percent=quote.change_percent if quote else None,
            risk=risk,
            market_is_open=market_status.is_open,
        )

        return generate_price_forecast(
            symbol,
            df,
            horizon_days,
            indicators=indicators,
            rule_prediction=rule_prediction,
            asset_type=asset_type,
            is_market_open=market_status.is_open,
            data_is_delayed=quote.is_delayed if quote else True,
        )

    cache_key = f"forecast:{symbol.upper()}:{horizon_days}:2y:1d"
    return cache.get_or_set(cache_key, settings.forecast_cache_ttl_seconds, _build)

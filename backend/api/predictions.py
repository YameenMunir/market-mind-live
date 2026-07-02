from __future__ import annotations

from fastapi import APIRouter

from models.schemas import PredictionHistoryEntry, PredictionResult
from prediction.engine import generate_prediction
from prediction.history_store import history_store
from services import price_service
from services.asset_service import resolve_asset_metadata
from services.indicator_service import compute_indicators
from services.market_status_service import get_market_status
from services.risk_service import compute_risk
from utils.errors import AppError

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

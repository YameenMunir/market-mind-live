from __future__ import annotations

from fastapi import APIRouter

from models.schemas import PredictionHistoryEntry, PredictionResult
from prediction.engine import generate_prediction
from prediction.history_store import history_store
from services import price_service
from services.indicator_service import compute_indicators

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/{symbol}", response_model=PredictionResult)
def get_prediction(symbol: str):
    df = price_service.get_history_df(symbol, period="1y", interval="1d")
    indicators = compute_indicators(symbol, df)
    price = float(df["Close"].iloc[-1])
    prediction = generate_prediction(symbol, price, indicators)
    history_store.record(prediction, price)
    return prediction


@router.get("/{symbol}/history", response_model=list[PredictionHistoryEntry])
def get_prediction_history(symbol: str):
    return history_store.get_history(symbol)

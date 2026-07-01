from __future__ import annotations

from fastapi import APIRouter

from models.schemas import IndicatorSet
from services import price_service
from services.indicator_service import compute_indicators

router = APIRouter(prefix="/api/indicators", tags=["indicators"])


@router.get("/{symbol}", response_model=IndicatorSet)
def get_indicators(symbol: str):
    df = price_service.get_history_df(symbol, period="1y", interval="1d")
    return compute_indicators(symbol, df)

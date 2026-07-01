from __future__ import annotations

from fastapi import APIRouter

from models.schemas import MarketStatus
from services.market_status_service import get_market_status

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/status/{symbol}", response_model=MarketStatus)
def market_status(symbol: str):
    return get_market_status(symbol)

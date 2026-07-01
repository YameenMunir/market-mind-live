from __future__ import annotations

from fastapi import APIRouter

from models.schemas import CandleSeries, PriceQuote
from services import price_service

router = APIRouter(prefix="/api/prices", tags=["prices"])


@router.get("/{symbol}/quote", response_model=PriceQuote)
def get_quote(symbol: str):
    return price_service.get_quote(symbol)


@router.get("/{symbol}/candles", response_model=CandleSeries)
def get_candles(symbol: str, interval: str = "1d"):
    return price_service.get_candles(symbol, interval=interval)

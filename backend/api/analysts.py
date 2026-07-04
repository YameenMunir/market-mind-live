from __future__ import annotations

from fastapi import APIRouter

from models.schemas import AnalystConsensus
from services import analyst_service, price_service

router = APIRouter(prefix="/api/analysts", tags=["analysts"])


@router.get("/{symbol}", response_model=AnalystConsensus)
def get_analyst_consensus(symbol: str):
    currency = "USD"
    try:
        currency = price_service.get_quote(symbol).currency
    except Exception:
        pass  # fall back to the schema default rather than failing the whole request
    return analyst_service.get_analyst_consensus(symbol, currency=currency)

from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import AnalystConsensus, RatingChangeFeed
from services import analyst_service, price_service, rating_change_service

router = APIRouter(prefix="/api/analysts", tags=["analysts"])


@router.get("/{symbol}", response_model=AnalystConsensus)
def get_analyst_consensus(symbol: str):
    currency = "USD"
    try:
        currency = price_service.get_quote(symbol).currency
    except Exception:
        pass  # fall back to the schema default rather than failing the whole request
    return analyst_service.get_analyst_consensus(symbol, currency=currency)


@router.get("/{symbol}/rating-changes", response_model=RatingChangeFeed)
def get_rating_changes(symbol: str, count: int = Query(default=20, ge=1, le=50)):
    return rating_change_service.get_rating_changes(symbol, count=count)

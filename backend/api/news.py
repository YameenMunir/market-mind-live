from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import NewsFeed
from services import news_service

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/{symbol}", response_model=NewsFeed)
def get_news(symbol: str, count: int = Query(default=10, ge=1, le=20)):
    return news_service.get_news(symbol, count=count)

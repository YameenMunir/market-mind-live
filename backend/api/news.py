from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from api.deps import get_device_id
from models.schemas import NewsDigest, NewsFeed
from services import news_digest_service, news_service

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/{symbol}", response_model=NewsFeed)
def get_news(symbol: str, count: int = Query(default=10, ge=1, le=20)):
    return news_service.get_news(symbol, count=count)


@router.get("/{symbol}/digest", response_model=NewsDigest)
async def get_news_digest(symbol: str, device_id: str = Depends(get_device_id)):
    return await news_digest_service.get_news_digest(symbol, device_id)

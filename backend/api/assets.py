from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import AssetFundamentals, AssetSearchResult, AssetType
from services.asset_service import get_asset_fundamentals, search_assets

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/search", response_model=list[AssetSearchResult])
def search(
    q: str = Query("", max_length=100, description="Search query"),
    asset_type: AssetType | None = None,
):
    # Rejected here (422, before any cache lookup or outbound call) rather than
    # relaxed silently - a query built entirely of whitespace/control characters is
    # never a meaningful search and would otherwise still cost a cache-key allocation
    # and, on a cache miss, a live Yahoo suggestion request for garbage input.
    return search_assets(q.strip(), asset_type=asset_type)


@router.get("/fundamentals", response_model=AssetFundamentals)
def get_fundamentals(symbol: str = Query(..., description="Ticker symbol")):
    return get_asset_fundamentals(symbol)


@router.get("/types", response_model=list[str])
def list_asset_types():
    return [t.value for t in AssetType]

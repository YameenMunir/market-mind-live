from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import AssetFundamentals, AssetSearchResult, AssetType
from services.asset_service import get_asset_fundamentals, search_assets

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/search", response_model=list[AssetSearchResult])
def search(q: str = Query("", description="Search query"), asset_type: AssetType | None = None):
    return search_assets(q, asset_type=asset_type)


@router.get("/fundamentals", response_model=AssetFundamentals)
def get_fundamentals(symbol: str = Query(..., description="Ticker symbol")):
    return get_asset_fundamentals(symbol)


@router.get("/types", response_model=list[str])
def list_asset_types():
    return [t.value for t in AssetType]

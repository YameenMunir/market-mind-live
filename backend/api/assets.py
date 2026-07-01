from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import AssetSearchResult, AssetType
from services.asset_service import search_assets

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("/search", response_model=list[AssetSearchResult])
def search(q: str = Query("", description="Search query"), asset_type: AssetType | None = None):
    return search_assets(q, asset_type=asset_type)


@router.get("/types", response_model=list[str])
def list_asset_types():
    return [t.value for t in AssetType]

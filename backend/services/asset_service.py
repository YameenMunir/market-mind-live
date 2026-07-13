from __future__ import annotations

from data.symbols import lookup_symbol, search_symbols
from models.schemas import AssetSearchResult, AssetType


def search_assets(query: str, asset_type: AssetType | None = None, limit: int = 15) -> list[AssetSearchResult]:
    results = search_symbols(query, asset_type=asset_type, limit=limit)
    return [AssetSearchResult(**entry) for entry in results]


def resolve_asset_metadata(symbol: str) -> dict | None:
    return lookup_symbol(symbol)


def get_asset_fundamentals(symbol: str) -> dict:
    from data.yfinance_provider import provider
    return provider.get_fundamentals(symbol)

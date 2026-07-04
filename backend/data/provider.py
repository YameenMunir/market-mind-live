from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd

from models.schemas import AssetType


class MarketDataProvider(ABC):
    """Abstraction over a live market data source.

    Kept intentionally thin so a paid vendor (Twelve Data, Finnhub, Polygon, ...)
    can be dropped in later without touching services/API layers.
    """

    @abstractmethod
    def get_quote(self, symbol: str) -> dict:
        ...

    @abstractmethod
    def get_history(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        ...

    @abstractmethod
    def get_analyst_consensus(self, symbol: str) -> dict:
        ...


def infer_asset_type(symbol: str) -> AssetType:
    s = symbol.upper().strip()
    if s.startswith("^"):
        return AssetType.INDEX
    if s.endswith("=X"):
        return AssetType.FOREX
    if s.endswith("=F"):
        return AssetType.COMMODITY
    if s.endswith("-USD") or s.endswith("-USDT") or s.endswith("-EUR"):
        return AssetType.CRYPTO
    return AssetType.STOCK

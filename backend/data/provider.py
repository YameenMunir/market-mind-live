from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

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
    def get_history(
        self,
        symbol: str,
        period: str = "6mo",
        interval: str = "1d",
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> pd.DataFrame:
        # When start/end are given they take precedence over period - needed for
        # chart ranges (e.g. 1 week, 2 weeks) that Yahoo has no native `period`
        # shorthand for.
        ...

    @abstractmethod
    def get_analyst_consensus(self, symbol: str) -> dict:
        ...

    @abstractmethod
    def get_quotes_batch(self, symbols: list[str]) -> dict[str, dict | Exception]:
        """Fetches quotes for multiple symbols in as few upstream requests as the
        provider supports. Keyed by uppercased symbol; a value is either the quote
        dict (same shape as `get_quote`) or the Exception raised for that symbol, so
        one bad ticker doesn't fail the whole batch."""
        ...

    @abstractmethod
    def get_news(self, symbol: str, count: int = 10) -> list[dict]:
        """Recent news headlines for a symbol, newest first. An empty list is a normal,
        valid result (many forex/commodity/index symbols have no news feed at all) -
        not an error."""
        ...

    @abstractmethod
    def get_rating_changes(self, symbol: str, count: int = 20) -> list[dict]:
        """Analyst rating-change events (upgrade/downgrade/initiated/reiterated) for a
        symbol, newest first. An empty list is a normal, valid result (most crypto/
        forex/commodity/index symbols and many small caps have no analyst coverage at
        all) - not an error."""
        ...

    @abstractmethod
    def get_fundamentals(self, symbol: str) -> dict:
        """Expose all company profile information, financial metrics, valuation statistics,
        and earnings dates available from the market data source."""
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

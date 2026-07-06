from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import CandleSeries, PriceQuote
from services import price_service

router = APIRouter(prefix="/api/prices", tags=["prices"])


@router.get("/batch/quotes", response_model=dict[str, PriceQuote | None])
def get_quotes_batch(symbols: str = Query(..., description="Comma-separated list of symbols, e.g. AAPL,MSFT,GOOG")):
    """Batched quote lookup for watchlists/multi-symbol views - fetches all requested
    symbols through one shared upstream call instead of looping one request per symbol.
    A symbol that fails (bad ticker, rate-limited, network error) resolves to `null`
    rather than failing the whole batch; check `/api/prices/{symbol}/quote` for that
    symbol's specific error if needed.
    """
    requested = [s.strip() for s in symbols.split(",") if s.strip()]
    results = price_service.get_quotes_batch(requested)
    return {symbol: (value if isinstance(value, PriceQuote) else None) for symbol, value in results.items()}


@router.get("/{symbol}/quote", response_model=PriceQuote)
def get_quote(symbol: str):
    return price_service.get_quote(symbol)


@router.get("/{symbol}/candles", response_model=CandleSeries)
def get_candles(
    symbol: str,
    range_: str = Query("1d", alias="range", description="Chart time range, e.g. 1d, 5d, 1wk, 1mo, ytd, max"),
):
    return price_service.get_candles(symbol, range_key=range_)

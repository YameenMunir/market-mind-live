from __future__ import annotations

from fastapi import APIRouter

from backtesting.engine import run_backtest
from models.schemas import BacktestRequest, BacktestResult
from services import price_service

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.post("", response_model=BacktestResult)
def backtest(request: BacktestRequest):
    period = _lookback_to_period(request.lookback_days)
    df = price_service.get_history_df(request.symbol, period=period, interval="1d")
    result = run_backtest(request.symbol, df, request.initial_capital)
    try:
        result.currency = price_service.get_quote(request.symbol).currency
    except Exception:
        pass  # keep the schema default ("USD") if the quote fetch fails
    return result


def _lookback_to_period(days: int) -> str:
    if days <= 30:
        return "1mo"
    if days <= 90:
        return "3mo"
    if days <= 180:
        return "6mo"
    if days <= 365:
        return "1y"
    if days <= 730:
        return "2y"
    if days <= 1825:
        return "5y"
    return "max"

from __future__ import annotations

import pandas as pd

from models.schemas import BacktestResult, BacktestTrade, EquityPoint, PredictionDirection
from services.indicator_service import compute_ema, compute_macd, compute_sma


def _max_drawdown_from_equity(equity: list[float]) -> float:
    peak = equity[0]
    max_dd = 0.0
    for value in equity:
        peak = max(peak, value)
        drawdown = (value - peak) / peak
        max_dd = min(max_dd, drawdown)
    return round(max_dd * 100, 2)


def run_backtest(symbol: str, df: pd.DataFrame, initial_capital: float) -> BacktestResult:
    close = df["Close"]
    sma_fast = compute_sma(close, 20)
    sma_slow = compute_sma(close, 50)
    _, _, histogram = compute_macd(close)

    bullish = (sma_fast > sma_slow) & (histogram > 0)

    position_open = False
    entry_price = 0.0
    entry_time = 0
    capital = initial_capital
    equity_curve: list[EquityPoint] = []
    trades: list[BacktestTrade] = []

    timestamps = [int(pd.Timestamp(ts).timestamp()) for ts in df.index]

    for i in range(len(df)):
        price = float(close.iloc[i])
        signal = bool(bullish.iloc[i]) if not pd.isna(bullish.iloc[i]) else False

        if not position_open and signal:
            position_open = True
            entry_price = price
            entry_time = timestamps[i]
        elif position_open and not signal:
            exit_price = price
            trade_return_pct = (exit_price - entry_price) / entry_price * 100
            capital *= 1 + trade_return_pct / 100
            trades.append(
                BacktestTrade(
                    entry_time=entry_time,
                    exit_time=timestamps[i],
                    entry_price=round(entry_price, 4),
                    exit_price=round(exit_price, 4),
                    direction=PredictionDirection.BULLISH,
                    return_pct=round(trade_return_pct, 3),
                )
            )
            position_open = False

        mark_to_market = capital
        if position_open:
            unrealized_pct = (price - entry_price) / entry_price
            mark_to_market = capital * (1 + unrealized_pct)

        equity_curve.append(EquityPoint(time=timestamps[i], equity=round(mark_to_market, 2)))

    if position_open:
        exit_price = float(close.iloc[-1])
        trade_return_pct = (exit_price - entry_price) / entry_price * 100
        capital *= 1 + trade_return_pct / 100
        trades.append(
            BacktestTrade(
                entry_time=entry_time,
                exit_time=timestamps[-1],
                entry_price=round(entry_price, 4),
                exit_price=round(exit_price, 4),
                direction=PredictionDirection.BULLISH,
                return_pct=round(trade_return_pct, 3),
            )
        )

    final_equity = round(capital, 2)
    total_return_pct = round((final_equity - initial_capital) / initial_capital * 100, 2)
    winning_trades = [t for t in trades if t.return_pct > 0]
    win_rate_pct = round(len(winning_trades) / len(trades) * 100, 1) if trades else 0.0
    max_drawdown_pct = _max_drawdown_from_equity([p.equity for p in equity_curve]) if equity_curve else 0.0

    return BacktestResult(
        symbol=symbol.upper(),
        lookback_days=len(df),
        initial_capital=initial_capital,
        final_equity=final_equity,
        total_return_pct=total_return_pct,
        win_rate_pct=win_rate_pct,
        max_drawdown_pct=max_drawdown_pct,
        total_trades=len(trades),
        equity_curve=equity_curve,
        trades=trades,
    )

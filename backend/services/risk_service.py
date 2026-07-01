from __future__ import annotations

import numpy as np
import pandas as pd

from models.schemas import RiskAssessment, RiskLevel


def compute_max_drawdown_pct(close: pd.Series) -> float:
    running_max = close.cummax()
    drawdown = (close - running_max) / running_max
    return round(float(drawdown.min()) * 100, 2)


def compute_annualized_volatility_pct(close: pd.Series, trading_periods: int = 252) -> float:
    returns = close.pct_change().dropna()
    if returns.empty:
        return 0.0
    return round(float(returns.std()) * np.sqrt(trading_periods) * 100, 2)


def _classify_risk(volatility_pct: float) -> tuple[RiskLevel, float]:
    # Rough thresholds calibrated against typical annualized volatility bands:
    # equities ~15-30%, majors FX ~7-12%, large caps low ~10-20%, crypto ~60-120%.
    if volatility_pct < 15:
        return RiskLevel.LOW, min(100, volatility_pct / 15 * 25)
    if volatility_pct < 35:
        return RiskLevel.MEDIUM, 25 + (volatility_pct - 15) / 20 * 25
    if volatility_pct < 70:
        return RiskLevel.HIGH, 50 + (volatility_pct - 35) / 35 * 25
    return RiskLevel.EXTREME, min(100, 75 + (volatility_pct - 70) / 70 * 25)


def compute_risk(symbol: str, df: pd.DataFrame) -> RiskAssessment:
    close = df["Close"]
    volatility_pct = compute_annualized_volatility_pct(close)
    max_drawdown_pct = compute_max_drawdown_pct(close)
    risk_level, risk_score = _classify_risk(volatility_pct)

    factors = [
        f"Annualized volatility of {volatility_pct}% based on recent daily returns.",
        f"Maximum observed drawdown of {abs(max_drawdown_pct)}% over the lookback window.",
    ]
    if volatility_pct >= 70:
        factors.append("Extreme price swings typical of highly speculative assets.")
    elif volatility_pct >= 35:
        factors.append("Elevated volatility suggests larger-than-average price swings.")

    return RiskAssessment(
        symbol=symbol.upper(),
        risk_level=risk_level,
        risk_score=round(risk_score, 1),
        volatility_annualized_pct=volatility_pct,
        max_drawdown_pct=max_drawdown_pct,
        factors=factors,
    )

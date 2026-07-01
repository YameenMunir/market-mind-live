from __future__ import annotations

import numpy as np
import pandas as pd

from models.schemas import BollingerBands, IndicatorSet, MACD, MovingAverages, SupportResistance


def _last(series: pd.Series) -> float | None:
    if series.empty or pd.isna(series.iloc[-1]):
        return None
    return round(float(series.iloc[-1]), 6)


def compute_sma(close: pd.Series, window: int) -> pd.Series:
    return close.rolling(window=window, min_periods=window).mean()


def compute_ema(close: pd.Series, window: int) -> pd.Series:
    return close.ewm(span=window, adjust=False).mean()


def compute_rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def compute_macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = compute_ema(close, fast)
    ema_slow = compute_ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_bollinger(close: pd.Series, window: int = 20, num_std: float = 2.0):
    middle = compute_sma(close, window)
    std = close.rolling(window=window, min_periods=window).std()
    upper = middle + num_std * std
    lower = middle - num_std * std
    return upper, middle, lower


def compute_atr(df: pd.DataFrame, window: int = 14) -> pd.Series:
    high, low, close = df["High"], df["Low"], df["Close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    ).max(axis=1)
    return tr.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()


def compute_support_resistance(df: pd.DataFrame, window: int = 5, levels: int = 3) -> SupportResistance:
    highs = df["High"]
    lows = df["Low"]

    resistance_points = []
    support_points = []

    for i in range(window, len(df) - window):
        local_high = highs.iloc[i - window : i + window + 1]
        local_low = lows.iloc[i - window : i + window + 1]
        if highs.iloc[i] == local_high.max():
            resistance_points.append(float(highs.iloc[i]))
        if lows.iloc[i] == local_low.min():
            support_points.append(float(lows.iloc[i]))

    def _dedupe_top(values: list[float], reverse: bool) -> list[float]:
        sorted_vals = sorted(set(round(v, 4) for v in values), reverse=reverse)
        return sorted_vals[:levels]

    return SupportResistance(
        resistance=_dedupe_top(resistance_points, reverse=True),
        support=_dedupe_top(support_points, reverse=False),
    )


def compute_indicators(symbol: str, df: pd.DataFrame) -> IndicatorSet:
    close = df["Close"]

    rsi = compute_rsi(close)
    macd_line, signal_line, histogram = compute_macd(close)
    upper, middle, lower = compute_bollinger(close)
    atr = compute_atr(df)

    return IndicatorSet(
        symbol=symbol.upper(),
        rsi_14=_last(rsi),
        moving_averages=MovingAverages(
            sma_20=_last(compute_sma(close, 20)),
            sma_50=_last(compute_sma(close, 50)),
            sma_200=_last(compute_sma(close, 200)),
            ema_12=_last(compute_ema(close, 12)),
            ema_26=_last(compute_ema(close, 26)),
        ),
        macd=MACD(
            macd_line=_last(macd_line),
            signal_line=_last(signal_line),
            histogram=_last(histogram),
        ),
        bollinger_bands=BollingerBands(
            upper=_last(upper),
            middle=_last(middle),
            lower=_last(lower),
        ),
        support_resistance=compute_support_resistance(df),
        atr_14=_last(atr),
    )

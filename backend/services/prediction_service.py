"""Multi-day price forecast - a statistical baseline (GBM-style random-walk projection
using historical drift/volatility), not a trained ML model, nudged by the existing
rule-based `prediction/engine.py::generate_prediction()` signal so the forecast reads as
directionally consistent with the single-point prediction shown elsewhere in the app.

Deliberately takes `df`/`indicators`/`rule_prediction` as parameters rather than fetching
them itself, mirroring `indicator_service.compute_indicators(symbol, df)` and
`risk_service.compute_risk(symbol, df)` - keeps this a pure, easily-testable function and
lets the caller (api/predictions.py) fetch data once and reuse it for both the rule engine
and this forecast.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

import numpy as np
import pandas as pd

from models.schemas import AssetType, ForecastPoint, IndicatorSet, PredictionDirection, PredictionResult, PriceForecast
from services.risk_service import compute_annualized_volatility_pct
from utils.errors import InsufficientHistoryError

logger = logging.getLogger(__name__)

# Below this many daily bars, both the mean and std of daily log returns are too noisy to
# project forward meaningfully (~3 months of daily data is a rough floor for a stable
# annualized-return estimate).
MIN_HISTORY_BARS = 60

# Cap on how much history feeds the drift/volatility estimate even if more is available -
# older data may reflect a different volatility/trend regime, and diluting the recent
# regime with many years of history would make the forecast less locally responsive.
MAX_HISTORY_BARS = 504  # ~2 trading years

ALLOWED_HORIZONS = (1, 3, 7, 14, 30)

# Bounded nudge from the rule-based signal into the statistical drift estimate - keeps the
# forecast directionally consistent with the existing PredictionCard without letting a
# single rule-based confidence score dominate a statistical projection. Capped at half of
# one daily-volatility standard deviation even at maximum (95%) rule-engine confidence.
SIGNAL_BLEND_WEIGHT = 0.5

# 80% two-sided confidence interval, applied multiplicatively in log-return space (GBM-style)
# so bands stay strictly positive and scale with price level and sqrt(time).
CONFIDENCE_Z = 1.2816
CONFIDENCE_LEVEL_PCT = 80

# Per-point confidence floor - the UI should never show a forecast point as ~0% confidence
# (reads as "broken"), even at the farthest (30-day) horizon.
MIN_POINT_CONFIDENCE = 20.0

DIRECTION_SIGN = {
    PredictionDirection.BULLISH: 1.0,
    PredictionDirection.BEARISH: -1.0,
    PredictionDirection.NEUTRAL: 0.0,
}

DISCLAIMER = "Predictions are estimates for educational purposes only and are not financial advice."


def _daily_log_returns(close: pd.Series, max_bars: int = MAX_HISTORY_BARS) -> pd.Series:
    trimmed = close.tail(max_bars + 1)  # +1 so max_bars *returns* result, not max_bars *prices*
    return np.log(trimmed / trimmed.shift(1)).dropna()


def _business_days_only(asset_type: AssetType | None) -> bool:
    """True if forecast dates should skip Sat/Sun (equities/ETFs/indices/forex/commodities),
    False if every calendar day counts (crypto, 24/7)."""
    return asset_type != AssetType.CRYPTO


def _generate_forecast_dates(anchor: date, horizon_days: int, business_days_only: bool) -> list[date]:
    dates: list[date] = []
    current = anchor
    while len(dates) < horizon_days:
        current = current + timedelta(days=1)
        if business_days_only and current.weekday() >= 5:
            continue
        dates.append(current)
    return dates


def generate_price_forecast(
    symbol: str,
    df: pd.DataFrame,
    horizon_days: int,
    *,
    indicators: IndicatorSet,
    rule_prediction: PredictionResult,
    asset_type: AssetType | None = None,
    is_market_open: bool = True,
    data_is_delayed: bool = True,
) -> PriceForecast:
    if horizon_days not in ALLOWED_HORIZONS:
        raise ValueError(f"horizon_days must be one of {ALLOWED_HORIZONS}, got {horizon_days}")

    close = df["Close"]
    if len(close) < MIN_HISTORY_BARS:
        raise InsufficientHistoryError(
            f"Not enough historical data to build a forecast for {symbol.upper()}.",
            detail=f"Found {len(close)} daily bars, need at least {MIN_HISTORY_BARS}.",
        )

    log_returns = _daily_log_returns(close)
    daily_drift = float(log_returns.mean())
    daily_vol = float(log_returns.std())

    # Reused purely for the human-readable methodology string below (not the day-by-day
    # math, which needs the *daily* std directly) - avoids silently duplicating/deriving a
    # second definition of "volatility" that could drift out of sync with risk_service's.
    annualized_vol_pct = compute_annualized_volatility_pct(close)

    direction_sign = DIRECTION_SIGN[rule_prediction.direction]
    confidence_factor = (rule_prediction.confidence - 50) / 50  # -1..+1, 0 at "no conviction"
    signal_adjustment = direction_sign * confidence_factor * SIGNAL_BLEND_WEIGHT * daily_vol
    blended_daily_drift = daily_drift + signal_adjustment

    last_close = float(close.iloc[-1])
    last_date = pd.Timestamp(close.index[-1]).date()
    business_days_only = _business_days_only(asset_type)
    forecast_dates = _generate_forecast_dates(last_date, horizon_days, business_days_only)

    base_confidence = rule_prediction.confidence
    decay_rate = (base_confidence - MIN_POINT_CONFIDENCE) / (ALLOWED_HORIZONS[-1] ** 0.5)

    points: list[ForecastPoint] = []
    for t, forecast_date in enumerate(forecast_dates, start=1):
        cumulative_drift = blended_daily_drift * t
        predicted_price = last_close * float(np.exp(cumulative_drift))

        band_half_width = CONFIDENCE_Z * daily_vol * (t**0.5)
        upper_bound = predicted_price * float(np.exp(band_half_width))
        lower_bound = predicted_price * float(np.exp(-band_half_width))

        point_confidence = max(MIN_POINT_CONFIDENCE, base_confidence - decay_rate * (t**0.5))

        points.append(
            ForecastPoint(
                date=forecast_date.isoformat(),
                predicted_price=round(predicted_price, 6),
                lower_bound=round(lower_bound, 6),
                upper_bound=round(upper_bound, 6),
                confidence=round(point_confidence, 1),
            )
        )

    methodology = (
        f"Statistical projection from {len(log_returns)} daily returns (drift "
        f"{daily_drift * 100:.3f}%/day, volatility {daily_vol * 100:.3f}%/day, "
        f"{annualized_vol_pct:.1f}% annualized), nudged by the rule-based signal "
        f"({rule_prediction.direction.value}, {rule_prediction.confidence:.0f}% confidence). "
        f"Bands reflect an approximate {CONFIDENCE_LEVEL_PCT}% range, not a hard limit."
    )

    logger.info(
        "Generated forecast symbol=%s horizon_days=%d bars=%d daily_drift=%.5f daily_vol=%.5f "
        "signal=%s/%.1f blended_drift=%.5f",
        symbol.upper(),
        horizon_days,
        len(close),
        daily_drift,
        daily_vol,
        rule_prediction.direction.value,
        rule_prediction.confidence,
        blended_daily_drift,
    )

    return PriceForecast(
        symbol=symbol.upper(),
        horizon_days=horizon_days,
        generated_at=datetime.now(timezone.utc).isoformat(),
        last_actual_price=round(last_close, 6),
        last_actual_date=last_date.isoformat(),
        is_market_open=is_market_open,
        data_is_delayed=data_is_delayed,
        methodology=methodology,
        disclaimer=DISCLAIMER,
        points=points,
    )

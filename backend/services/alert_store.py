"""In-memory storage and evaluation for price/signal alerts.

Alerts are one-shot: once a condition is met the alert flips to TRIGGERED and is no
longer evaluated, so a threshold that stays crossed for hours doesn't fire again every
poll cycle. Users re-arm by creating a new alert. Same in-memory tradeoff as
`prediction/history_store.py` and `chat_store.py` - resets on restart, fine for a
demo/dev deployment; swap for a real DB table if alerts need to survive restarts or be
scoped per-user once auth exists.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from threading import Lock

from models.schemas import Alert, AlertCondition, AlertStatus, IndicatorSet, PredictionResult, PriceQuote, RiskAssessment
from services.context_builder import signal_from_prediction

DEFAULT_RSI_OVERBOUGHT = 70.0
DEFAULT_RSI_OVERSOLD = 30.0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AlertStore:
    def __init__(self) -> None:
        self._alerts: dict[str, Alert] = {}
        self._lock = Lock()

    def create(
        self,
        *,
        symbol: str,
        asset_name: str | None,
        condition: AlertCondition,
        threshold: float | None,
        note: str | None,
        baseline_value: str | None,
    ) -> Alert:
        alert = Alert(
            id=str(uuid.uuid4()),
            symbol=symbol.upper(),
            asset_name=asset_name,
            condition=condition,
            threshold=threshold,
            baseline_value=baseline_value,
            note=note,
            status=AlertStatus.ACTIVE,
            created_at=_now_iso(),
        )
        with self._lock:
            self._alerts[alert.id] = alert
        return alert

    def list_all(self, symbol: str | None = None) -> list[Alert]:
        with self._lock:
            alerts = list(self._alerts.values())
        if symbol:
            alerts = [a for a in alerts if a.symbol == symbol.upper()]
        alerts.sort(key=lambda a: a.created_at, reverse=True)
        return alerts

    def delete(self, alert_id: str) -> bool:
        with self._lock:
            return self._alerts.pop(alert_id, None) is not None

    def dismiss(self, alert_id: str) -> bool:
        with self._lock:
            alert = self._alerts.get(alert_id)
            if alert is None:
                return False
            alert.status = AlertStatus.DISMISSED
            return True

    def _trigger(self, alert: Alert, message: str) -> None:
        alert.status = AlertStatus.TRIGGERED
        alert.triggered_at = _now_iso()
        alert.triggered_message = message

    def evaluate(
        self,
        symbol: str,
        *,
        quote: PriceQuote | None,
        indicators: IndicatorSet | None,
        prediction: PredictionResult | None,
        risk: RiskAssessment | None,
    ) -> None:
        """Checks every ACTIVE alert for this symbol against the latest known state and
        flips any that now meet their condition to TRIGGERED. Called from the live hub's
        poll loop so this runs against real-time data without a separate polling path -
        price-based conditions get near-real-time evaluation (quote refreshes every
        `hub_quote_interval_seconds`), while RSI/signal/risk conditions evaluate against
        whatever was last computed on their own slower cadence, consistent with the rest
        of the app's refresh strategy.
        """
        symbol = symbol.upper()
        with self._lock:
            candidates = [a for a in self._alerts.values() if a.symbol == symbol and a.status == AlertStatus.ACTIVE]

        for alert in candidates:
            if alert.condition == AlertCondition.PRICE_ABOVE and quote and alert.threshold is not None:
                if quote.price >= alert.threshold:
                    self._trigger(
                        alert,
                        f"{symbol} price reached {quote.price:.4f}, at or above your alert level of {alert.threshold:.4f}.",
                    )
            elif alert.condition == AlertCondition.PRICE_BELOW and quote and alert.threshold is not None:
                if quote.price <= alert.threshold:
                    self._trigger(
                        alert,
                        f"{symbol} price reached {quote.price:.4f}, at or below your alert level of {alert.threshold:.4f}.",
                    )
            elif alert.condition == AlertCondition.RSI_OVERBOUGHT and indicators and indicators.rsi_14 is not None:
                threshold = alert.threshold if alert.threshold is not None else DEFAULT_RSI_OVERBOUGHT
                if indicators.rsi_14 >= threshold:
                    self._trigger(
                        alert,
                        f"{symbol} RSI reached {indicators.rsi_14:.1f}, at or above the overbought level of {threshold:.0f}.",
                    )
            elif alert.condition == AlertCondition.RSI_OVERSOLD and indicators and indicators.rsi_14 is not None:
                threshold = alert.threshold if alert.threshold is not None else DEFAULT_RSI_OVERSOLD
                if indicators.rsi_14 <= threshold:
                    self._trigger(
                        alert,
                        f"{symbol} RSI reached {indicators.rsi_14:.1f}, at or below the oversold level of {threshold:.0f}.",
                    )
            elif alert.condition == AlertCondition.SIGNAL_CHANGE and prediction is not None and alert.baseline_value:
                current_signal = signal_from_prediction(prediction.direction, prediction.confidence)
                if current_signal != alert.baseline_value:
                    self._trigger(alert, f"{symbol}'s model signal changed from {alert.baseline_value} to {current_signal}.")
            elif alert.condition == AlertCondition.RISK_LEVEL_CHANGE and risk is not None and alert.baseline_value:
                current_level = risk.risk_level.value
                if current_level != alert.baseline_value:
                    self._trigger(alert, f"{symbol}'s risk level changed from {alert.baseline_value} to {current_level}.")


alert_store = AlertStore()

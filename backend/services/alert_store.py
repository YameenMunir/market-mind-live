"""Database-backed storage and evaluation for price/signal alerts, scoped per device.

Alerts are one-shot: once a condition is met the alert flips to TRIGGERED and is no
longer evaluated, so a threshold that stays crossed for hours doesn't fire again every
poll cycle. Users re-arm by creating a new alert.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from db.models import AlertRecord
from db.session import engine
from models.schemas import (
    Alert,
    AlertCondition,
    AlertStatus,
    IndicatorSet,
    PredictionResult,
    PriceQuote,
    RiskAssessment,
)
from services.context_builder import signal_from_prediction

DEFAULT_RSI_OVERBOUGHT = 70.0
DEFAULT_RSI_OVERSOLD = 30.0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_schema(record: AlertRecord) -> Alert:
    return Alert(
        id=record.id,
        symbol=record.symbol,
        asset_name=record.asset_name,
        condition=AlertCondition(record.condition),
        threshold=record.threshold,
        baseline_value=record.baseline_value,
        note=record.note,
        status=AlertStatus(record.status),
        created_at=record.created_at,
        triggered_at=record.triggered_at,
        triggered_message=record.triggered_message,
    )


class AlertStore:
    def create(
        self,
        *,
        device_id: str,
        symbol: str,
        asset_name: str | None,
        condition: AlertCondition,
        threshold: float | None,
        note: str | None,
        baseline_value: str | None,
    ) -> Alert:
        record = AlertRecord(
            id=str(uuid.uuid4()),
            device_id=device_id,
            symbol=symbol.upper(),
            asset_name=asset_name,
            condition=condition.value,
            threshold=threshold,
            baseline_value=baseline_value,
            note=note,
            status=AlertStatus.ACTIVE.value,
            created_at=_now_iso(),
        )
        with Session(engine) as session:
            session.add(record)
            session.commit()
            session.refresh(record)
        return _to_schema(record)

    def list_all(self, device_id: str, symbol: str | None = None) -> list[Alert]:
        with Session(engine) as session:
            statement = select(AlertRecord).where(AlertRecord.device_id == device_id)
            if symbol:
                statement = statement.where(AlertRecord.symbol == symbol.upper())
            records = session.exec(statement).all()
        alerts = [_to_schema(r) for r in records]
        alerts.sort(key=lambda a: a.created_at, reverse=True)
        return alerts

    def delete(self, alert_id: str) -> bool:
        with Session(engine) as session:
            record = session.get(AlertRecord, alert_id)
            if record is None:
                return False
            session.delete(record)
            session.commit()
            return True

    def dismiss(self, alert_id: str) -> bool:
        with Session(engine) as session:
            record = session.get(AlertRecord, alert_id)
            if record is None:
                return False
            record.status = AlertStatus.DISMISSED.value
            session.add(record)
            session.commit()
            return True

    def _trigger(self, session: Session, record: AlertRecord, message: str) -> None:
        record.status = AlertStatus.TRIGGERED.value
        record.triggered_at = _now_iso()
        record.triggered_message = message
        session.add(record)

    def evaluate(
        self,
        symbol: str,
        *,
        quote: PriceQuote | None,
        indicators: IndicatorSet | None,
        prediction: PredictionResult | None,
        risk: RiskAssessment | None,
    ) -> None:
        """Checks every ACTIVE alert for this symbol (across every device) against the
        latest known state and flips any that now meet their condition to TRIGGERED.
        Called from the live hub's poll loop so this runs against real-time data
        without a separate polling path - price-based conditions get near-real-time
        evaluation (quote refreshes every `hub_quote_interval_seconds`), while
        RSI/signal/risk conditions evaluate against whatever was last computed on their
        own slower cadence, consistent with the rest of the app's refresh strategy.
        This runs outside any request context, so it opens its own short-lived session
        rather than using FastAPI's `Depends(get_session)`.
        """
        symbol = symbol.upper()
        with Session(engine) as session:
            statement = select(AlertRecord).where(
                AlertRecord.symbol == symbol, AlertRecord.status == AlertStatus.ACTIVE.value
            )
            candidates = session.exec(statement).all()

            for record in candidates:
                condition = AlertCondition(record.condition)
                if condition == AlertCondition.PRICE_ABOVE and quote and record.threshold is not None:
                    if quote.price >= record.threshold:
                        self._trigger(
                            session,
                            record,
                            f"{symbol} price reached {quote.price:.4f}, at or above your alert level of {record.threshold:.4f}.",
                        )
                elif condition == AlertCondition.PRICE_BELOW and quote and record.threshold is not None:
                    if quote.price <= record.threshold:
                        self._trigger(
                            session,
                            record,
                            f"{symbol} price reached {quote.price:.4f}, at or below your alert level of {record.threshold:.4f}.",
                        )
                elif condition == AlertCondition.RSI_OVERBOUGHT and indicators and indicators.rsi_14 is not None:
                    threshold = record.threshold if record.threshold is not None else DEFAULT_RSI_OVERBOUGHT
                    if indicators.rsi_14 >= threshold:
                        self._trigger(
                            session,
                            record,
                            f"{symbol} RSI reached {indicators.rsi_14:.1f}, at or above the overbought level of {threshold:.0f}.",
                        )
                elif condition == AlertCondition.RSI_OVERSOLD and indicators and indicators.rsi_14 is not None:
                    threshold = record.threshold if record.threshold is not None else DEFAULT_RSI_OVERSOLD
                    if indicators.rsi_14 <= threshold:
                        self._trigger(
                            session,
                            record,
                            f"{symbol} RSI reached {indicators.rsi_14:.1f}, at or below the oversold level of {threshold:.0f}.",
                        )
                elif condition == AlertCondition.SIGNAL_CHANGE and prediction is not None and record.baseline_value:
                    current_signal = signal_from_prediction(prediction.direction, prediction.confidence)
                    if current_signal != record.baseline_value:
                        self._trigger(
                            session,
                            record,
                            f"{symbol}'s model signal changed from {record.baseline_value} to {current_signal}.",
                        )
                elif condition == AlertCondition.RISK_LEVEL_CHANGE and risk is not None and record.baseline_value:
                    current_level = risk.risk_level.value
                    if current_level != record.baseline_value:
                        self._trigger(
                            session,
                            record,
                            f"{symbol}'s risk level changed from {record.baseline_value} to {current_level}.",
                        )

            session.commit()


alert_store = AlertStore()

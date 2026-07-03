from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import (
    Alert,
    AlertActionResponse,
    AlertCondition,
    AlertCreateRequest,
    AlertListResponse,
)
from services import context_builder
from services.alert_store import alert_store
from services.asset_service import resolve_asset_metadata
from utils.errors import ValidationError

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

_BASELINE_CONDITIONS = (AlertCondition.SIGNAL_CHANGE, AlertCondition.RISK_LEVEL_CHANGE)
_THRESHOLD_CONDITIONS = (AlertCondition.PRICE_ABOVE, AlertCondition.PRICE_BELOW)


@router.post("", response_model=Alert)
def create_alert(request: AlertCreateRequest):
    symbol = request.symbol.upper()

    if request.condition in _THRESHOLD_CONDITIONS and request.threshold is None:
        raise ValidationError(f"A price threshold is required for a '{request.condition.value}' alert.")

    metadata = resolve_asset_metadata(symbol)
    asset_name = metadata["name"] if metadata else None

    baseline_value: str | None = None
    if request.condition in _BASELINE_CONDITIONS:
        # Signal/risk-level alerts fire on divergence from *this asset's current state*,
        # not a fixed number - capture that baseline now so evaluate() has something to
        # compare against as new predictions/risk assessments come in.
        context = context_builder.build_asset_context(symbol)
        if request.condition == AlertCondition.SIGNAL_CHANGE:
            if context.prediction is None:
                raise ValidationError(f"Could not determine a current model signal for '{symbol}' to set a baseline.")
            baseline_value = context.prediction.signal
        else:
            if context.risk is None:
                raise ValidationError(f"Could not determine a current risk level for '{symbol}' to set a baseline.")
            baseline_value = context.risk.level.value

    return alert_store.create(
        symbol=symbol,
        asset_name=asset_name,
        condition=request.condition,
        threshold=request.threshold,
        note=request.note,
        baseline_value=baseline_value,
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(symbol: str | None = Query(default=None)):
    return AlertListResponse(alerts=alert_store.list_all(symbol))


@router.delete("/{alert_id}", response_model=AlertActionResponse)
def delete_alert(alert_id: str):
    alert_store.delete(alert_id)
    return AlertActionResponse(status="deleted")


@router.post("/{alert_id}/dismiss", response_model=AlertActionResponse)
def dismiss_alert(alert_id: str):
    alert_store.dismiss(alert_id)
    return AlertActionResponse(status="dismissed")

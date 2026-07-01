from __future__ import annotations

from fastapi import APIRouter

from models.schemas import RiskAssessment
from services import price_service
from services.risk_service import compute_risk

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/{symbol}", response_model=RiskAssessment)
def get_risk(symbol: str):
    df = price_service.get_history_df(symbol, period="1y", interval="1d")
    return compute_risk(symbol, df)

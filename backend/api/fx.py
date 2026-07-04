from __future__ import annotations

from fastapi import APIRouter

from models.schemas import FxRates
from services import fx_service

router = APIRouter(prefix="/api/fx", tags=["fx"])


@router.get("/rates", response_model=FxRates)
def get_rates():
    return fx_service.get_fx_rates()

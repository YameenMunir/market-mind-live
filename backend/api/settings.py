from __future__ import annotations

from fastapi import APIRouter, Depends

from api.deps import get_device_id
from models.schemas import UserSettings
from services.user_settings_store import user_settings_store

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=UserSettings)
def get_settings(device_id: str = Depends(get_device_id)):
    return user_settings_store.get(device_id)


@router.put("", response_model=UserSettings)
def update_settings(request: UserSettings, device_id: str = Depends(get_device_id)):
    return user_settings_store.update(device_id, request.experience_mode)

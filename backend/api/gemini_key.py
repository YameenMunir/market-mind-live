from __future__ import annotations

from fastapi import APIRouter, Depends

from api.deps import get_device_id
from models.schemas import GeminiKeyStatus, GeminiKeyUpdateRequest
from services.gemini_key_store import gemini_key_store

router = APIRouter(prefix="/api/ai/gemini-key", tags=["gemini-key"])


@router.get("", response_model=GeminiKeyStatus)
def get_gemini_key(device_id: str = Depends(get_device_id)):
    return gemini_key_store.get_status(device_id)


@router.put("", response_model=GeminiKeyStatus)
def set_gemini_key(request: GeminiKeyUpdateRequest, device_id: str = Depends(get_device_id)):
    return gemini_key_store.set_key(device_id, request.api_key)


@router.delete("", response_model=GeminiKeyStatus)
def delete_gemini_key(device_id: str = Depends(get_device_id)):
    gemini_key_store.delete_key(device_id)
    return GeminiKeyStatus(has_key=False)

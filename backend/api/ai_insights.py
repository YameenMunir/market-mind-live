from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from api.deps import get_device_id
from models.schemas import (
    AIAssetContext,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    DeleteSessionResponse,
    FeedbackRequest,
    FeedbackResponse,
    NewSessionRequest,
    NewSessionResponse,
    SessionDetailResponse,
    SessionListResponse,
    SummariseRequest,
    SummariseResponse,
)
from services import ai_insights_service, context_builder

router = APIRouter(prefix="/api/ai/insights", tags=["ai-insights"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, device_id: str = Depends(get_device_id)):
    return await ai_insights_service.handle_chat(request, device_id)


@router.get("/context/{asset}", response_model=AIAssetContext)
def get_context(asset: str):
    return context_builder.build_asset_context(asset)


@router.post("/feedback", response_model=FeedbackResponse)
def feedback(request: FeedbackRequest):
    ai_insights_service.record_feedback(request)
    return FeedbackResponse()


@router.get("/history", response_model=ChatHistoryResponse)
def history(session_id: str = Query(..., description="Chat session identifier")):
    return ai_insights_service.get_history(session_id)


@router.post("/summarise", response_model=SummariseResponse)
async def summarise(request: SummariseRequest, device_id: str = Depends(get_device_id)):
    return await ai_insights_service.handle_summarise(request, device_id)


@router.post("/new-session", response_model=NewSessionResponse)
def new_session(request: NewSessionRequest, device_id: str = Depends(get_device_id)):
    return ai_insights_service.create_new_session(request, device_id)


@router.get("/sessions", response_model=SessionListResponse)
def sessions(device_id: str = Depends(get_device_id)):
    return ai_insights_service.list_sessions(device_id)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def session_detail(session_id: str):
    return ai_insights_service.get_session(session_id)


@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
def delete_session(session_id: str):
    return ai_insights_service.delete_session(session_id)

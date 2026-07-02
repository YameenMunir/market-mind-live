from __future__ import annotations

from fastapi import APIRouter, Query

from models.schemas import (
    AIAssetContext,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    FeedbackRequest,
    FeedbackResponse,
    SummariseRequest,
    SummariseResponse,
)
from services import ai_insights_service, context_builder

router = APIRouter(prefix="/api/ai/insights", tags=["ai-insights"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    return await ai_insights_service.handle_chat(request)


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
async def summarise(request: SummariseRequest):
    return await ai_insights_service.handle_summarise(request)

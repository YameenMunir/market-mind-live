from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

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
    RegenerateRequest,
    SessionDetailResponse,
    SessionListResponse,
    SummariseRequest,
    SummariseResponse,
)
from services import ai_insights_service, context_builder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/insights", tags=["ai-insights"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, device_id: str = Depends(get_device_id)):
    return await ai_insights_service.handle_chat(request, device_id)


def _sse_response(agen) -> StreamingResponse:
    """Wraps a `handle_*_stream` async generator (yielding event dicts) as an SSE
    `StreamingResponse`. A client disconnect (the frontend aborting its fetch when the
    user clicks "Stop generating") is detected by Starlette itself, which cancels the
    generator this wraps - the service-layer generators persist whatever partial reply
    had been generated via a `finally` block, so cancellation doesn't need any special
    handling here.
    """

    async def event_stream():
        try:
            async for event in agen:
                yield f"data: {json.dumps(event)}\n\n"
        except Exception:
            # Last-resort safety net for a genuinely unexpected failure - anything the
            # service layer itself anticipates (rate limits, provider errors) is
            # already translated into a normal {"type": "error", ...} event and never
            # reaches here. Deliberately `except Exception`, not a bare `except`, so
            # asyncio.CancelledError (raised on client disconnect - see docstring
            # above) is left to propagate rather than being swallowed as a fake error.
            logger.exception("Unhandled error while streaming an AI chat response")
            yield f"data: {json.dumps({'type': 'error', 'error_code': 'internal_error', 'message': 'An unexpected error occurred.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, device_id: str = Depends(get_device_id)):
    """Server-Sent Events counterpart to `/chat` - each event is a JSON-encoded
    `{"type": "chunk" | "done" | "error", ...}` line (see
    `ai_insights_service.handle_chat_stream`)."""
    return _sse_response(ai_insights_service.handle_chat_stream(request, device_id))


@router.post("/chat/regenerate")
async def chat_regenerate(request: RegenerateRequest, device_id: str = Depends(get_device_id)):
    """SSE counterpart to `/chat/stream` for the "Regenerate" button - re-answers the
    session's most recent question in place, discarding the stale reply (see
    `ai_insights_service.handle_regenerate_stream`)."""
    return _sse_response(ai_insights_service.handle_regenerate_stream(request, device_id))


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
async def new_session(request: NewSessionRequest, device_id: str = Depends(get_device_id)):
    return await ai_insights_service.create_new_session(request, device_id)


@router.get("/sessions", response_model=SessionListResponse)
def sessions(device_id: str = Depends(get_device_id)):
    return ai_insights_service.list_sessions(device_id)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
def session_detail(session_id: str):
    return ai_insights_service.get_session(session_id)


@router.delete("/sessions/{session_id}", response_model=DeleteSessionResponse)
def delete_session(session_id: str):
    return ai_insights_service.delete_session(session_id)

"""Orchestrates the AI Insights Assistant: context resolution, prompting, provider
selection (Gemini vs mock), session history, and feedback recording."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from config import get_settings
from models.schemas import (
    AIAssetContext,
    ChatHistoryResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatRole,
    DeleteSessionResponse,
    ErrorCode,
    FeedbackRequest,
    NewSessionRequest,
    NewSessionResponse,
    SessionDetailResponse,
    SessionListResponse,
    SummariseRequest,
    SummariseResponse,
)
from services import context_builder, gemini_service, mock_ai_provider
from services.chat_store import FeedbackEntry, chat_store, feedback_store
from services.gemini_key_store import gemini_key_store
from services.knowledge_base import retrieve as retrieve_knowledge
from utils.cache import RateLimiter, cache
from utils.errors import AppError

DISCLAIMER = "This is for informational purposes only and is not financial advice."

BASE_SYSTEM_INSTRUCTIONS = """You are the AI Insights Assistant embedded in Market Mind Live, a fintech market \
analytics dashboard. You help users understand live prices, charts, technical indicators, AI/ML predictions, \
risk scores, and backtesting results that are already shown in the app.

Rules you must always follow:
1. Never guarantee profits or promise a specific outcome.
2. Never say a trade or forecast is "certain" - all predictions are probabilistic, not guaranteed.
3. Never give reckless, unqualified buy/sell instructions ("you should buy now") - frame signals as one input \
among many, and encourage the user to consider their own risk tolerance and risk management.
4. Always explain uncertainty, model confidence, and limitations when discussing a prediction or signal.
5. If the provided data is delayed, cached, stale, or missing, say so explicitly rather than presenting it as \
real-time or complete.
6. Default to simple, plain-English explanations; go into technical depth (formulas, exact methodology) only \
when the user asks for it or clearly has trading experience.
7. Ground every answer only in the structured app context and knowledge-base notes provided below - do not \
invent data points, prices, or indicator values that are not present in the context.
8. If the context is insufficient to answer confidently, say plainly what information is missing rather than \
guessing.
9. Prefer educational, explanatory framing ("here's what this typically means") over directive financial advice.
10. Keep answers concise and well-structured (short paragraphs or bullet points), not walls of text.
11. Always end substantive answers with a brief reminder that this is informational, not financial advice, \
unless the user is asking a purely educational/definitional question where it would feel repetitive mid-conversation.
"""


def _rate_limiter() -> RateLimiter:
    settings = get_settings()
    return RateLimiter(max_per_minute=settings.ai_chat_rate_limit_per_minute)


# Module-level limiter instance so the sliding window persists across requests.
_chat_rate_limiter: RateLimiter | None = None


def _get_chat_rate_limiter() -> RateLimiter:
    global _chat_rate_limiter
    if _chat_rate_limiter is None:
        _chat_rate_limiter = _rate_limiter()
    return _chat_rate_limiter


class ChatRateLimitedError(AppError):
    status_code = 429
    error_code = ErrorCode.RATE_LIMITED

    def __init__(self) -> None:
        super().__init__(
            "You're sending messages too quickly.", detail="Please wait a moment before asking another question."
        )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_gemini_api_key(device_id: str, settings) -> str | None:
    """A device's own BYOK Gemini key (set via /api/ai/gemini-key) takes priority over
    the server-wide GEMINI_API_KEY, so a user who supplies their own key always gets
    live Gemini even when the server itself has none configured."""
    return gemini_key_store.get_decrypted_key(device_id) or settings.gemini_api_key


def resolve_context(asset: str, client_context: AIAssetContext | None) -> AIAssetContext:
    """Prefer the context the frontend already has on screen (guarantees the assistant
    talks about exactly what the user is looking at); fall back to a fresh server-side
    build if the client didn't send one (e.g. the `/context/{asset}` preview endpoint,
    or a client that hasn't loaded live data yet)."""
    if client_context is not None:
        return client_context
    return context_builder.build_asset_context(asset)


def _build_system_instruction(context: AIAssetContext, user_message: str) -> str:
    kb_articles = retrieve_knowledge(user_message)
    kb_section = ""
    if kb_articles:
        kb_section = "\n\nRelevant methodology notes from the app's knowledge base:\n" + "\n".join(
            f"- {a.title}: {a.body}" for a in kb_articles
        )

    context_json = context.model_dump_json(indent=2)
    return (
        f"{BASE_SYSTEM_INSTRUCTIONS}\n\n"
        f"Structured application context for the asset currently being discussed "
        f"(treat this as ground truth for current data - do not contradict it):\n{context_json}"
        f"{kb_section}"
    )


async def handle_chat(request: ChatRequest, device_id: str) -> ChatResponse:
    if not _get_chat_rate_limiter().check(request.session_id):
        raise ChatRateLimitedError()

    settings = get_settings()
    context = resolve_context(request.asset, request.client_context)
    history = chat_store.get_history(request.session_id, limit=settings.ai_max_history_messages)
    system_instruction = _build_system_instruction(context, request.message)

    provider = "mock"
    reply: str
    api_key = _resolve_gemini_api_key(device_id, settings)
    if api_key:
        # Identical (context + question) pairs within a short window return the cached
        # reply instead of calling Gemini again - guards against accidental double-sends
        # and immediate retries burning a second paid API call for the same answer.
        # Keyed only by content, not by which key answered it - two devices asking the
        # same question about the same context get the same cached reply regardless of
        # whose Gemini key served it, since the answer itself doesn't depend on that.
        cache_key = "gemini_reply:" + hashlib.sha256(f"{system_instruction}\x1f{request.message}".encode()).hexdigest()
        cached_reply = cache.get(cache_key)
        if cached_reply is not None:
            reply = cached_reply
            provider = "gemini-cached"
        else:
            try:
                reply = await gemini_service.generate_reply(
                    system_instruction=system_instruction,
                    history=history,
                    user_message=request.message,
                    model=settings.gemini_model,
                    api_key=api_key,
                    timeout_seconds=settings.gemini_timeout_seconds,
                )
                provider = "gemini"
                cache.set(cache_key, reply, settings.ai_response_cache_ttl_seconds)
            except gemini_service.GeminiRateLimitError:
                # A hard, actionable limit - surface it rather than silently degrading,
                # so the user knows to slow down instead of getting a confusing fallback.
                raise
            except AppError:
                reply = mock_ai_provider.generate_mock_reply(context, request.message, history)
                reply += "\n\n_(Live AI assistant temporarily unavailable - showing a local summary instead.)_"
                provider = "mock-fallback"
    else:
        reply = mock_ai_provider.generate_mock_reply(context, request.message, history)

    now = _now_iso()
    user_msg = ChatMessage(message_id=str(uuid.uuid4()), role=ChatRole.USER, content=request.message, created_at=now)
    assistant_msg_id = str(uuid.uuid4())
    assistant_msg = ChatMessage(message_id=assistant_msg_id, role=ChatRole.ASSISTANT, content=reply, created_at=_now_iso())

    chat_store.append(request.session_id, user_msg)
    chat_store.append(request.session_id, assistant_msg)
    chat_store.touch(
        request.session_id,
        asset=context.asset,
        asset_name=context.asset_name,
        preview=request.message,  # the user's question reads better in a history list than the full reply
        signal=context.prediction.signal if context.prediction else None,
        risk_level=context.risk.level if context.risk else None,
        device_id=device_id,
    )

    return ChatResponse(
        session_id=request.session_id,
        message_id=assistant_msg_id,
        reply=reply,
        provider=provider,
        context_used=context,
        disclaimer=DISCLAIMER,
        created_at=assistant_msg.created_at,
    )


async def handle_summarise(request: SummariseRequest, device_id: str) -> SummariseResponse:
    context = resolve_context(request.asset, request.client_context)
    prompt = (
        "Summarise the single most important insight from this dashboard right now in 2-4 sentences, "
        "covering the current signal, its confidence/reliability, and the dominant risk factor."
    )
    system_instruction = _build_system_instruction(context, prompt)

    settings = get_settings()
    provider = "mock"
    api_key = _resolve_gemini_api_key(device_id, settings)
    if api_key:
        try:
            summary = await gemini_service.generate_reply(
                system_instruction=system_instruction,
                history=[],
                user_message=prompt,
                model=settings.gemini_model,
                api_key=api_key,
                timeout_seconds=settings.gemini_timeout_seconds,
            )
            provider = "gemini"
        except AppError:
            summary = mock_ai_provider.generate_mock_reply(context, prompt, [])
            provider = "mock-fallback"
    else:
        summary = mock_ai_provider.generate_mock_reply(context, prompt, [])

    return SummariseResponse(asset=context.asset, summary=summary, provider=provider, disclaimer=DISCLAIMER)


def record_feedback(request: FeedbackRequest) -> None:
    feedback_store.record(
        FeedbackEntry(
            session_id=request.session_id,
            message_id=request.message_id,
            rating=request.rating,
            comment=request.comment,
        )
    )


def get_history(session_id: str) -> ChatHistoryResponse:
    return ChatHistoryResponse(session_id=session_id, messages=chat_store.get_history(session_id))


def _build_welcome_message(context: AIAssetContext) -> str:
    label = f"{context.asset_name} ({context.asset})" if context.asset_name else context.asset
    lines = [
        f"AI Insights for {label} are ready. Ask me about the latest signal, technical indicators, "
        "risk score, prediction, or chart trend."
    ]
    if context.missing_data:
        lines.append("Note: " + " ".join(context.missing_data))
    return "\n\n".join(lines)


def create_new_session(request: NewSessionRequest, device_id: str) -> NewSessionResponse:
    """Starts a fresh, asset-scoped chat session with a deterministic welcome message
    (no Gemini/mock call needed just to say hello - keeps this instant and free)."""
    session_id = str(uuid.uuid4())
    context = resolve_context(request.asset, request.client_context)
    welcome_text = _build_welcome_message(context)
    welcome_msg = ChatMessage(
        message_id=str(uuid.uuid4()), role=ChatRole.ASSISTANT, content=welcome_text, created_at=_now_iso()
    )

    chat_store.append(session_id, welcome_msg)
    chat_store.touch(
        session_id,
        asset=context.asset,
        asset_name=context.asset_name,
        preview=welcome_text,
        signal=context.prediction.signal if context.prediction else None,
        risk_level=context.risk.level if context.risk else None,
        device_id=device_id,
    )

    return NewSessionResponse(session_id=session_id, asset=context.asset, welcome_message=welcome_msg, disclaimer=DISCLAIMER)


def list_sessions(device_id: str) -> SessionListResponse:
    return SessionListResponse(sessions=chat_store.list_sessions(device_id))


def get_session(session_id: str) -> SessionDetailResponse:
    meta = chat_store.get_meta(session_id)
    messages = chat_store.get_history(session_id)
    return SessionDetailResponse(
        session_id=session_id,
        asset=meta.asset if meta else None,
        asset_name=meta.asset_name if meta else None,
        messages=messages,
    )


def delete_session(session_id: str) -> DeleteSessionResponse:
    chat_store.delete(session_id)
    return DeleteSessionResponse()

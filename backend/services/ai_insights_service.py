"""Orchestrates the AI Insights Assistant: context resolution, prompting, provider
selection (Gemini vs mock), session history, and feedback recording."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

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


def _chunk_text(text: str, words_per_chunk: int = 4) -> list[str]:
    """Splits an already-complete string into small, whitespace-preserving pieces so
    the mock provider and cached-reply paths stream through the same progressive-reveal
    UI a genuine Gemini stream uses, instead of arriving as one flat blob. Purely a
    presentation concern - no delay is added between chunks.

    Each piece (except the last) carries a trailing space, since callers concatenate
    pieces directly with no separator (matching how a real token/word delta stream
    works) - without it, the space consumed by `split(" ")` at each chunk boundary
    would simply be lost, silently smashing words together every N words.
    """
    words = text.split(" ")
    chunks = []
    for i in range(0, len(words), words_per_chunk):
        piece = " ".join(words[i : i + words_per_chunk])
        if i + words_per_chunk < len(words):
            piece += " "
        chunks.append(piece)
    return chunks


async def handle_chat_stream(request: ChatRequest, device_id: str) -> AsyncIterator[dict]:
    """Streaming counterpart to `handle_chat` - yields one dict per SSE event instead
    of returning a single `ChatResponse`:

    - `{"type": "chunk", "text": ...}` for each incremental piece of the reply.
    - A single terminal `{"type": "done", ...}` (mirrors ChatResponse's fields) on
      success, or `{"type": "error", "error_code": ..., "message": ...}` if nothing
      could be generated at all.

    Persistence happens in a `finally` block rather than only after a clean loop exit,
    so a client disconnect (the frontend's "Stop generating" button aborts its fetch,
    which FastAPI/Starlette surfaces here as the streaming task being cancelled) still
    saves whatever partial reply was generated up to that point, instead of silently
    losing it. See `handle_chat`'s docstring context above for the non-streaming
    equivalent this stays behaviorally in sync with.
    """
    if not _get_chat_rate_limiter().check(request.session_id):
        exc = ChatRateLimitedError()
        yield {"type": "error", "error_code": exc.error_code.value, "message": exc.message}
        return

    settings = get_settings()
    context = resolve_context(request.asset, request.client_context)
    history = chat_store.get_history(request.session_id, limit=settings.ai_max_history_messages)
    system_instruction = _build_system_instruction(context, request.message)

    provider = "mock"
    accumulated = ""
    assistant_msg_id: str | None = None
    created_at: str | None = None
    api_key = _resolve_gemini_api_key(device_id, settings)

    try:
        if api_key:
            # Same anti-double-submit cache as handle_chat - a cached reply is already
            # fully generated, so it's chunked and streamed back at full speed (no
            # delay) purely so the UI treatment stays consistent regardless of path.
            cache_key = "gemini_reply:" + hashlib.sha256(
                f"{system_instruction}\x1f{request.message}".encode()
            ).hexdigest()
            cached_reply = cache.get(cache_key)
            if cached_reply is not None:
                for chunk in _chunk_text(cached_reply):
                    accumulated += chunk
                    yield {"type": "chunk", "text": chunk}
                provider = "gemini-cached"
            else:
                try:
                    async for piece in gemini_service.stream_reply(
                        system_instruction=system_instruction,
                        history=history,
                        user_message=request.message,
                        model=settings.gemini_model,
                        api_key=api_key,
                        timeout_seconds=settings.gemini_timeout_seconds,
                    ):
                        accumulated += piece
                        yield {"type": "chunk", "text": piece}
                    provider = "gemini"
                    cache.set(cache_key, accumulated, settings.ai_response_cache_ttl_seconds)
                except gemini_service.GeminiRateLimitError as exc:
                    if not accumulated:
                        # Same as handle_chat: a hard, actionable limit hit before any
                        # content generated - surface it rather than silently degrading.
                        yield {"type": "error", "error_code": exc.error_code.value, "message": exc.message}
                        return
                    provider = "gemini-interrupted"
                except AppError:
                    if accumulated:
                        provider = "gemini-interrupted"
                    else:
                        for chunk in _chunk_text(mock_ai_provider.generate_mock_reply(context, request.message, history)):
                            accumulated += chunk
                            yield {"type": "chunk", "text": chunk}
                        provider = "mock-fallback"

                if provider == "gemini-interrupted":
                    note = "\n\n_(Connection to the AI assistant was interrupted - showing the partial response above.)_"
                    accumulated += note
                    yield {"type": "chunk", "text": note}
                elif provider == "mock-fallback":
                    note = "\n\n_(Live AI assistant temporarily unavailable - showing a local summary instead.)_"
                    accumulated += note
                    yield {"type": "chunk", "text": note}
        else:
            for chunk in _chunk_text(mock_ai_provider.generate_mock_reply(context, request.message, history)):
                accumulated += chunk
                yield {"type": "chunk", "text": chunk}
            provider = "mock"
    finally:
        # Runs on natural completion *and* on cancellation (client disconnect/Stop
        # generating) - a truncated reply is still worth saving rather than losing.
        if accumulated:
            now = _now_iso()
            user_msg = ChatMessage(message_id=str(uuid.uuid4()), role=ChatRole.USER, content=request.message, created_at=now)
            assistant_msg_id = str(uuid.uuid4())
            created_at = _now_iso()
            assistant_msg = ChatMessage(
                message_id=assistant_msg_id, role=ChatRole.ASSISTANT, content=accumulated, created_at=created_at
            )

            chat_store.append(request.session_id, user_msg)
            chat_store.append(request.session_id, assistant_msg)
            chat_store.touch(
                request.session_id,
                asset=context.asset,
                asset_name=context.asset_name,
                preview=request.message,
                signal=context.prediction.signal if context.prediction else None,
                risk_level=context.risk.level if context.risk else None,
                device_id=device_id,
            )

    # Unreachable on cancellation (the `finally` above still ran, but execution never
    # returns here) - the frontend's stream simply ending without a "done" event is
    # itself the signal that generation was stopped/interrupted before completing.
    yield {
        "type": "done",
        "session_id": request.session_id,
        "message_id": assistant_msg_id,
        "provider": provider,
        "context_used": context.model_dump(mode="json"),
        "disclaimer": DISCLAIMER,
        "created_at": created_at,
    }


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

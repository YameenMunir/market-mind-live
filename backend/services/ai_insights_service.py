"""Orchestrates the AI Insights Assistant: context resolution, prompting, provider
selection (Gemini vs mock), session history, and feedback recording."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from config import get_settings
from data.symbols import SYMBOL_DIRECTORY, lookup_symbol
from models.schemas import (
    AIAssetContext,
    AIComparisonAssetContext,
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
    RegenerateRequest,
    SessionDetailResponse,
    SessionListResponse,
    SummariseRequest,
    SummariseResponse,
)
from services import context_builder, gemini_service, mock_ai_provider
from services.reasoning_engine import reasoning_engine
from services.chat_store import FeedbackEntry, chat_store, feedback_store
from services.gemini_key_store import gemini_key_store
from services.knowledge_base import retrieve as retrieve_knowledge
from utils.cache import RateLimiter, cache
from utils.errors import AppError

logger = logging.getLogger(__name__)

DISCLAIMER = "This is for informational purposes only and is not financial advice."

# Colloquial names/nicknames for symbols in data/symbols.py's curated directory - not
# derivable from the "name" field by simple suffix-stripping (e.g. "Google" vs the
# official "Alphabet Inc.", "The Walt Disney Company" vs "Disney"), so spelled out
# explicitly. Keyed lowercase; matched against the lowercased user message as a
# substring in `_extract_comparison_symbol_fast`.
_ASSET_NAME_ALIASES: dict[str, str] = {
    "apple": "AAPL",
    "microsoft": "MSFT",
    "google": "GOOGL", "alphabet": "GOOGL",
    "amazon": "AMZN",
    "nvidia": "NVDA",
    "meta": "META", "facebook": "META",
    "tesla": "TSLA",
    "netflix": "NFLX",
    "jpmorgan": "JPM", "jp morgan": "JPM",
    "visa": "V",
    "walmart": "WMT",
    "disney": "DIS",
    "boeing": "BA",
    "intel": "INTC",
    "spy": "SPY",
    "qqq": "QQQ",
    "russell 2000": "IWM",
    "vanguard total stock market": "VTI",
    "ark innovation": "ARKK",
    "bitcoin": "BTC-USD",
    "ethereum": "ETH-USD",
    "solana": "SOL-USD",
    "xrp": "XRP-USD", "ripple": "XRP-USD",
    "cardano": "ADA-USD",
    "dogecoin": "DOGE-USD",
    "avalanche": "AVAX-USD",
    "euro": "EURUSD=X",
    "pound": "GBPUSD=X", "sterling": "GBPUSD=X",
    "yen": "USDJPY=X",
    "gold": "GC=F",
    "silver": "SI=F",
    "crude oil": "CL=F", "oil": "CL=F", "wti": "CL=F",
    "natural gas": "NG=F",
    "copper": "HG=F",
    "s&p 500": "^GSPC", "s&p500": "^GSPC", "sp500": "^GSPC", "s&p": "^GSPC",
    "dow jones": "^DJI", "dow": "^DJI",
    "nasdaq composite": "^IXIC", "nasdaq": "^IXIC",
    "vix": "^VIX",
    "ftse 100": "^FTSE", "ftse": "^FTSE",
}

# All-caps words a user might plausibly type that are NOT ticker symbols - excluded
# from the free-text ticker scan so e.g. "is AI going to help here" or "what's the
# RSI at" doesn't get misread as a request to compare against a (nonexistent)
# ticker called "AI" or "RSI".
_TICKER_FALSE_POSITIVES = frozenset({
    "I", "A", "OK", "CEO", "CFO", "CTO", "IPO", "ETF", "ETFS", "AI", "ATH", "ATL",
    "USD", "EUR", "GBP", "JPY", "YOLO", "FOMO", "DCA", "RSI", "MACD", "SMA", "EMA",
    "ATR", "PE", "EPS", "IMO", "TLDR", "FAQ", "API", "IT", "OR", "TO", "IS", "AT",
    "ON", "IN", "SO", "NO", "UP", "PM", "AM", "US",
})

# Matches word-like tokens including the special characters real ticker symbols use
# (^GSPC, BTC-USD, EURUSD=X, GC=F) so both plain tickers and suffixed ones survive
# tokenization as a single candidate.
_TOKEN_PATTERN = re.compile(r"\^?[A-Za-z][A-Za-z0-9]*(?:[.\-=][A-Za-z0-9]+)*")


def _extract_comparison_symbol_fast(message: str, exclude_symbol: str) -> str | None:
    """Synchronous (no network I/O) half of comparison-symbol extraction - checks
    the message against the app's own curated symbol directory and known name
    aliases only. See `_extract_comparison_symbol` for the full (async, network-
    capable) version used by the chat handlers.
    """
    exclude = exclude_symbol.upper()
    directory_by_symbol = {entry["symbol"].upper(): entry["symbol"] for entry in SYMBOL_DIRECTORY}
    tokens = _TOKEN_PATTERN.findall(message)

    # Tier 1: an explicit ticker already in the curated directory, matched
    # case-insensitively - safe against false positives since it's bounded to the
    # ~46 real symbols there, not arbitrary English words.
    for token in tokens:
        upper = token.upper()
        if upper != exclude and upper in directory_by_symbol:
            return directory_by_symbol[upper]

    # Tier 2: a known company/asset name or nickname (e.g. "Microsoft", "gold",
    # "S&P 500") - the longest matching alias wins, so a more specific phrase (e.g.
    # "crude oil") is preferred over a shorter one that's also a substring of it.
    lowered = message.lower()
    best_alias: tuple[int, str] | None = None
    for alias, symbol in _ASSET_NAME_ALIASES.items():
        if symbol.upper() == exclude:
            continue
        if alias in lowered and (best_alias is None or len(alias) > best_alias[0]):
            best_alias = (len(alias), symbol)
    return best_alias[1] if best_alias else None


def _uppercase_ticker_candidates(message: str, exclude_symbol: str) -> list[str]:
    """Tokens typed in genuine uppercase in the original message (not just
    case-insensitively uppercase-able) - the signal used to justify a live lookup
    for a ticker outside the curated directory (e.g. "COIN", "RIVN") without
    misreading ordinary lowercase words as tickers.
    """
    exclude = exclude_symbol.upper()
    candidates = []
    for token in _TOKEN_PATTERN.findall(message):
        base = token.split("-")[0].split("=")[0].lstrip("^")
        if not base.isalpha() or not (1 <= len(base) <= 6):
            continue
        if token != token.upper() or token == exclude or token in _TICKER_FALSE_POSITIVES:
            continue
        candidates.append(token)
    return candidates


async def _extract_comparison_symbol(message: str, exclude_symbol: str) -> str | None:
    """Best-effort extraction of a second symbol the user wants the primary asset
    compared against (e.g. "compare AAPL to MSFT", "how does this stack up against
    Microsoft?", "AAPL vs COIN"). Tries, in increasing cost order: an explicit
    ticker already in the curated symbol directory, a known company/asset name
    alias, then a live Yahoo symbol lookup for an explicit uppercase ticker outside
    the curated list - so this isn't limited to the ~46 symbols in SYMBOL_DIRECTORY.
    Returns None if nothing plausible is found, rather than guessing.
    """
    fast = _extract_comparison_symbol_fast(message, exclude_symbol)
    if fast:
        return fast

    for token in _uppercase_ticker_candidates(message, exclude_symbol):
        try:
            resolved = await asyncio.to_thread(lookup_symbol, token)
        except Exception:
            # This is an opportunistic, best-effort lookup (a ticker outside the
            # curated directory) - a live-search failure (rate limit, network
            # error, ...) must degrade to "no comparison found" rather than take
            # down the primary chat reply this is only enriching.
            logger.warning("Comparison symbol lookup failed for token=%s", token, exc_info=True)
            continue
        if resolved and resolved["symbol"].upper() != exclude_symbol.upper():
            return resolved["symbol"]
    return None


async def _build_comparison_context(symbol: str) -> AIComparisonAssetContext | None:
    """Fetches a full grounding snapshot for `symbol` via the same pipeline every
    other asset context goes through (`context_builder.build_asset_context` - live
    quote, indicators, prediction, risk, rating changes, news), then trims it down
    to `AIComparisonAssetContext`'s shape. Reusing that pipeline rather than a
    stripped-down fetch means the comparison side of the analysis is grounded in
    data exactly as rich and real as the primary asset's, not a lightweight
    approximation. Returns None (never raises) if the symbol can't be resolved or
    the fetch fails for any reason - a failed comparison lookup must degrade to "no
    comparison data available" rather than break the primary chat reply.
    """
    try:
        full = await asyncio.to_thread(context_builder.build_asset_context, symbol)
    except Exception:
        logger.warning("Could not build comparison context for %s", symbol, exc_info=True)
        return None
    return AIComparisonAssetContext(
        asset=full.asset,
        asset_name=full.asset_name,
        latest_price=full.latest_price,
        price_change_percent=full.price_change_percent,
        market_status=full.market_status,
        is_market_open=full.is_market_open,
        data_is_delayed=full.data_is_delayed,
        technical_indicators=full.technical_indicators,
        prediction=full.prediction,
        risk=full.risk,
        rating_changes=full.rating_changes,
        news=full.news[:2],
    )

BASE_SYSTEM_INSTRUCTIONS = """You are a world-class AI Stock Market Analyst and Portfolio Manager embedded in Market Mind Live. \
Your role is to provide expert-level, highly personalized, and data-driven analysis to the user's trading questions.

Rules you must always follow:
1. Speak with the authority and tone of an experienced portfolio manager—natural, analytical, professional, and conversational.
2. Avoid robotic templates or repetitive phrases like "according to the model" or "current settings indicate".
3. Ground your analysis in the structured data context provided below. Discuss indicators (RSI, MACD, Bollinger Bands, SMAs, EMAs, Volatility, ATR) and fundamental context (analyst consensus, news sentiment, recent ratings changes) only when they directly help answer the user's specific query. Do not just list them.
4. Frame all analysis probabilistically; never promise certainties, guarantee profits, or offer reckless unqualified recommendations.
5. If some data is missing or marked delayed in the context, mention it transparently.
6. Write in flawless, professional English: correct spelling, correct grammar (subject-verb agreement, correct articles like "a"/"an", consistent verb tense), and correct punctuation (no run-on sentences, no missing or doubled spaces/periods, no comma splices). Use complete, well-formed sentences even inside bullet points. Proofread your own reply before sending it.
7. Never invent a specific number - price, percentage, indicator reading, date, or statistic - that is not present in the structured context or knowledge base notes below. If the user asks for a data point that isn't available there, say plainly that it isn't available in the current context rather than estimating or guessing a plausible-sounding value.
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


def _reply_cache_key(context: AIAssetContext, message: str) -> str:
    """Cache key for the anti-double-send Gemini reply cache (see `handle_chat`,
    `handle_chat_stream`, `handle_regenerate_stream`). Built from the context's actual
    data plus the question - deliberately excludes `last_updated`, a millisecond-
    precision timestamp restamped on every `resolve_context()` call (both
    `context_builder.py` server-side and `frontend/src/lib/aiContext.ts` client-side),
    which would otherwise make the key differ on every single request - including a
    literal duplicate send - and defeat the cache entirely.
    """
    stable_context = context.model_dump_json(exclude={"last_updated"})
    return "gemini_reply:" + hashlib.sha256(f"{stable_context}\x1f{message}".encode()).hexdigest()


def _resolve_gemini_api_key(device_id: str, settings) -> str | None:
    """A device's own BYOK Gemini key (set via /api/ai/gemini-key) takes priority over
    the server-wide GEMINI_API_KEY, so a user who supplies their own key always gets
    live Gemini even when the server itself has none configured."""
    return gemini_key_store.get_decrypted_key(device_id) or settings.gemini_api_key


async def resolve_context(asset: str, client_context: AIAssetContext | None) -> AIAssetContext:
    """Prefer the context the frontend already has on screen (guarantees the assistant
    talks about exactly what the user is looking at); fall back to a fresh server-side
    build if the client didn't send one (e.g. the `/context/{asset}` preview endpoint,
    or a client that hasn't loaded live data yet).

    `build_asset_context` is synchronous and makes several blocking calls (yfinance
    fetches, and a rate limiter that can do a real `time.sleep`) - offloaded to a
    thread so a cold-context request can't stall the whole event loop the way
    `services/live_hub.py` already avoids for the same underlying calls."""
    if client_context is not None:
        return client_context
    return await asyncio.to_thread(context_builder.build_asset_context, asset)


async def _build_system_instruction(
    context: AIAssetContext, user_message: str, history: list[ChatMessage]
) -> tuple[str, AIAssetContext]:
    """Returns the full Gemini/mock system prompt for this turn, plus `context`
    (possibly augmented with `.comparison` if this turn's intent is COMPARE and a
    second asset could be resolved from the message) - callers should use the
    returned context for everything downstream (the mock-provider fallback,
    `context_used` in the response), not the one they passed in, so a resolved
    comparison is visible everywhere the primary context is.
    """
    kb_articles = retrieve_knowledge(user_message)
    kb_section = ""
    if kb_articles:
        kb_section = "\n\nRelevant methodology notes from the app's knowledge base:\n" + "\n".join(
            f"- {a.title}: {a.body}" for a in kb_articles
        )

    has_portfolio = reasoning_engine.detect_portfolio_context(history, user_message)
    portfolio_instructions = ""
    if has_portfolio:
        portfolio_instructions = "\nPortfolio Context: The user already holds a position in this asset. Frame recommendations through portfolio management, rebalancing, and risk reduction rather than entry-level buying.\n"

    intent = reasoning_engine.detect_intent(user_message)
    intent_guideline = reasoning_engine.get_guideline(intent)
    intent_instructions = f"\nFocus Areas for this Query:\n- {intent_guideline}\n"

    comparison_instructions = ""
    if intent == "COMPARE" and context.comparison is None:
        comparison_symbol = await _extract_comparison_symbol(user_message, context.asset)
        if comparison_symbol:
            comparison = await _build_comparison_context(comparison_symbol)
            if comparison is not None:
                context = context.model_copy(update={"comparison": comparison})
            else:
                context = context.model_copy(
                    update={
                        "missing_data": [
                            *context.missing_data,
                            f"Comparison data for {comparison_symbol} is currently unavailable.",
                        ]
                    }
                )
    if context.comparison is not None:
        comparison_instructions = (
            "\nThe structured context below includes a `comparison` object with the "
            "same kind of data for a second asset the user wants compared against "
            "the primary one. Use its real numbers to make a specific, numbers-based "
            "side-by-side comparison (which has the stronger signal, which carries "
            "more risk, which has better momentum) instead of a generic answer.\n"
        )

    response_structure = """
Response Structure Guidelines:
Provide your analysis formatted in clean, professional markdown following this structure:
1. **Direct Answer**: Start with a single, clear, direct sentence addressing the user's specific question immediately.
2. **Reasoning**: A concise, analytical explanation integrating the relevant indicators and context.
3. **Bullish vs. Bearish Factors**: Use bullet points to list 2-3 key technical/fundamental factors on each side.
4. **Key Risks**: Detail the primary volatility or market risks.
5. **Confidence Level**: Specify a logical model confidence rating (e.g., 78% confidence based on indicator alignment).
6. **Actionable Scenarios / What to Watch Next**: Provide clear if-then scenarios and specific levels to monitor.
7. **Balanced Conclusion**: A professional, objective wrap-up.

Note: Adapt this structure dynamically to the user's query. If a section is irrelevant to their specific question (e.g., listing bullish factors when they are asking a pure risk/downside question), omit it naturally rather than forcing it. Do not sound robotic or mention "the prompt guidelines".
"""

    context_json = context.model_dump_json(indent=2)
    instruction = (
        f"{BASE_SYSTEM_INSTRUCTIONS}\n"
        f"{portfolio_instructions}"
        f"{intent_instructions}"
        f"{comparison_instructions}"
        f"{response_structure}\n"
        f"Structured application context for the asset currently being discussed "
        f"(treat this as ground truth for current data - do not contradict it):\n{context_json}"
        f"{kb_section}"
    )
    return instruction, context


async def handle_chat(request: ChatRequest, device_id: str) -> ChatResponse:
    if not _get_chat_rate_limiter().check(request.session_id):
        raise ChatRateLimitedError()

    settings = get_settings()
    context = await resolve_context(request.asset, request.client_context)
    history = chat_store.get_history(request.session_id, limit=settings.ai_max_history_messages)
    system_instruction, context = await _build_system_instruction(context, request.message, history)

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
        cache_key = _reply_cache_key(context, request.message)
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
    context = await resolve_context(request.asset, request.client_context)
    history = chat_store.get_history(request.session_id, limit=settings.ai_max_history_messages)
    system_instruction, context = await _build_system_instruction(context, request.message, history)

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
            cache_key = _reply_cache_key(context, request.message)
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


async def handle_regenerate_stream(request: RegenerateRequest, device_id: str) -> AsyncIterator[dict]:
    """Re-answers a session's most recent question with a fresh reply, discarding the
    stale assistant reply it's replacing - the "Regenerate" button's backend.

    Deliberately close to `handle_chat_stream`'s own structure (same rate-limit/cache/
    Gemini-fallback/cancellation-safe-persistence behavior - see its docstring for the
    shared rationale) rather than factored into a shared helper: the two differ in
    exactly what gets looked up/deleted/persisted at the edges (a fresh user message
    here vs. a reused one there), and an async generator can't itself return a value
    (PEP 525), which would make sharing the chunk-yielding middle section awkward
    without a materially simpler result.
    """
    if not _get_chat_rate_limiter().check(request.session_id):
        exc = ChatRateLimitedError()
        yield {"type": "error", "error_code": exc.error_code.value, "message": exc.message}
        return

    full_history = chat_store.get_history(request.session_id)
    last_user_index = next(
        (i for i in range(len(full_history) - 1, -1, -1) if full_history[i].role == ChatRole.USER), None
    )
    if last_user_index is None:
        yield {
            "type": "error",
            "error_code": ErrorCode.VALIDATION_ERROR.value,
            "message": "There's no question yet to regenerate a reply for.",
        }
        return

    user_message = full_history[last_user_index]
    stale_assistant_id: str | None = None
    if last_user_index + 1 < len(full_history) and full_history[last_user_index + 1].role == ChatRole.ASSISTANT:
        stale_assistant_id = full_history[last_user_index + 1].message_id
        chat_store.delete_message(request.session_id, stale_assistant_id)

    settings = get_settings()
    # Everything *before* the question being re-answered - deliberately excludes the
    # stale reply just deleted above, so Gemini isn't shown its own about-to-be-
    # discarded answer as if it were prior conversation context.
    history_prefix = full_history[:last_user_index]
    limit = settings.ai_max_history_messages
    history = history_prefix[-limit:] if limit > 0 else history_prefix

    context = await resolve_context(request.asset, request.client_context)
    system_instruction, context = await _build_system_instruction(context, user_message.content, history)

    provider = "mock"
    accumulated = ""
    assistant_msg_id: str | None = None
    created_at: str | None = None
    api_key = _resolve_gemini_api_key(device_id, settings)

    try:
        if api_key:
            cache_key = _reply_cache_key(context, user_message.content)
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
                        user_message=user_message.content,
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
                        yield {"type": "error", "error_code": exc.error_code.value, "message": exc.message}
                        return
                    provider = "gemini-interrupted"
                except AppError:
                    if accumulated:
                        provider = "gemini-interrupted"
                    else:
                        for chunk in _chunk_text(
                            mock_ai_provider.generate_mock_reply(context, user_message.content, history)
                        ):
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
            for chunk in _chunk_text(mock_ai_provider.generate_mock_reply(context, user_message.content, history)):
                accumulated += chunk
                yield {"type": "chunk", "text": chunk}
            provider = "mock"
    finally:
        # Same cancellation-safety rationale as handle_chat_stream's finally block -
        # only the new assistant reply is persisted here (the question already exists
        # in chat_store from its original turn).
        if accumulated:
            assistant_msg_id = str(uuid.uuid4())
            created_at = _now_iso()
            assistant_msg = ChatMessage(
                message_id=assistant_msg_id, role=ChatRole.ASSISTANT, content=accumulated, created_at=created_at
            )
            chat_store.append(request.session_id, assistant_msg)
            chat_store.touch(
                request.session_id,
                asset=context.asset,
                asset_name=context.asset_name,
                preview=user_message.content,
                signal=context.prediction.signal if context.prediction else None,
                risk_level=context.risk.level if context.risk else None,
                device_id=device_id,
            )

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
    context = await resolve_context(request.asset, request.client_context)
    prompt = (
        "Summarise the single most important insight from this dashboard right now in 2-4 sentences, "
        "covering the current signal, its confidence/reliability, and the dominant risk factor."
    )
    system_instruction, context = await _build_system_instruction(context, prompt, [])

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


async def create_new_session(request: NewSessionRequest, device_id: str) -> NewSessionResponse:
    """Starts a fresh, asset-scoped chat session with a deterministic welcome message
    (no Gemini/mock call needed just to say hello - keeps this instant and free)."""
    session_id = str(uuid.uuid4())
    context = await resolve_context(request.asset, request.client_context)
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

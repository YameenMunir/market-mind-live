"""Generates a short "here's what moved this week" prose digest from a symbol's news
feed - instead of making the user read every headline individually, summarizes the
overall theme/sentiment across them.

Follows the exact same pattern as the AI Insights Assistant (services/ai_insights_service.py):
grounded strictly in real data already fetched (no invented facts), a per-device "bring
your own key" Gemini key takes priority over the server-wide one, and a deterministic
local fallback keeps the feature working even with no Gemini key configured at all -
"AI-generated when possible, never a hard requirement" is a deliberate project-wide
convention, not something new introduced here.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from config import get_settings
from models.schemas import NewsDigest, NewsFeed
from services import gemini_service
from services.asset_service import resolve_asset_metadata
from services.gemini_key_store import gemini_key_store
from services.news_service import get_news
from utils.cache import cache
from utils.errors import AppError

logger = logging.getLogger(__name__)


def _resolve_gemini_api_key(device_id: str, settings) -> str | None:
    # Identical priority order to ai_insights_service.py's helper of the same name -
    # kept as its own small copy rather than a shared import so this module doesn't
    # take on a dependency on the chat-specific service for one two-line lookup.
    return gemini_key_store.get_decrypted_key(device_id) or settings.gemini_api_key


def _asset_label(symbol: str) -> str:
    metadata = resolve_asset_metadata(symbol)
    return f"{metadata['name']} ({symbol})" if metadata else symbol


def _generate_mock_digest(symbol: str, news: NewsFeed) -> str:
    if not news.articles:
        return f"No recent headlines found for {symbol} - check back later."

    lead = news.articles[0]
    others = news.articles[1:4]
    lead_bit = f'"{lead.title}"' + (f" ({lead.publisher})" if lead.publisher else "")
    lines = [f"{len(news.articles)} recent headline(s) for {symbol}. Most recent: {lead_bit}."]
    if others:
        lines.append("Also making headlines: " + "; ".join(a.title for a in others) + ".")
    lines.append("(Local summary - configure a Gemini API key for an AI-generated digest.)")
    return " ".join(lines)


_SYSTEM_INSTRUCTION_TEMPLATE = """You are a financial news editor. Summarize the following recent headlines about \
{asset_label} into a short "what moved this week" digest - 3 to 5 sentences of plain prose (not a bullet list), \
covering the overall theme/sentiment across the headlines as a whole rather than restating each one individually, \
and calling out the single most significant story if one clearly stands out.

Rules you must follow:
1. Never invent a fact, number, date, or event that is not present in the headlines below.
2. Do not give financial advice, a price target, or a buy/sell/hold recommendation.
3. If the headlines are mixed or contradictory, say so plainly rather than forcing a single narrative.
4. Write in flawless, professional English - no filler like "in conclusion" or "overall, this suggests".

Headlines:
{headlines_block}
"""


def _build_system_instruction(symbol: str, news: NewsFeed) -> str:
    headlines_block = "\n".join(
        f"- {a.title}" + (f" ({a.publisher})" if a.publisher else "") + (f": {a.summary}" if a.summary else "")
        for a in news.articles
    )
    return _SYSTEM_INSTRUCTION_TEMPLATE.format(asset_label=_asset_label(symbol), headlines_block=headlines_block)


async def get_news_digest(symbol: str, device_id: str) -> NewsDigest:
    settings = get_settings()
    symbol = symbol.upper()

    # Own cache, deliberately decoupled from news_service's own (shorter) TTL - a
    # "what moved this week" digest doesn't need to regenerate on every one of the
    # underlying feed's refresh cycles, and every viewer of a symbol gets the same
    # digest, so caching it directly (rather than only caching the Gemini call itself)
    # avoids a redundant regenerate-from-identical-headlines cost too.
    cache_key = f"news_digest:{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    news = await asyncio.to_thread(get_news, symbol, 10)

    if not news.articles:
        result = NewsDigest(
            symbol=symbol,
            summary=_generate_mock_digest(symbol, news),
            provider="mock",
            based_on_article_count=0,
            generated_at=datetime.now(timezone.utc).isoformat(),
            is_stale=news.is_stale,
        )
        cache.set(cache_key, result, settings.news_digest_cache_ttl_seconds)
        return result

    provider = "mock"
    api_key = _resolve_gemini_api_key(device_id, settings)
    if api_key:
        try:
            summary = await gemini_service.generate_reply(
                system_instruction=_build_system_instruction(symbol, news),
                history=[],
                user_message="Write the digest now.",
                model=settings.gemini_model,
                api_key=api_key,
                timeout_seconds=settings.gemini_timeout_seconds,
            )
            provider = "gemini"
        except AppError as exc:
            logger.warning(
                "News digest generation failed for %s (%s) - falling back to a local summary.",
                symbol, exc.error_code.value,
            )
            summary = _generate_mock_digest(symbol, news)
    else:
        summary = _generate_mock_digest(symbol, news)

    result = NewsDigest(
        symbol=symbol,
        summary=summary,
        provider=provider,
        based_on_article_count=len(news.articles),
        generated_at=datetime.now(timezone.utc).isoformat(),
        is_stale=news.is_stale,
    )
    cache.set(cache_key, result, settings.news_digest_cache_ttl_seconds)
    return result

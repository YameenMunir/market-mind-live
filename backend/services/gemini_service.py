"""Thin client for the Google Gemini "generateContent" REST API.

Deliberately implemented over plain `httpx` (already a dependency) rather than the
`google-generativeai` SDK, to avoid pulling in an extra heavyweight package for what
is a single JSON endpoint. Only called from the backend - the API key never reaches
the frontend.
"""

from __future__ import annotations

import logging

import httpx

from models.schemas import ChatMessage, ChatRole
from utils.errors import AppError, ErrorCode, MissingApiKeyError

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProviderError(AppError):
    status_code = 502
    error_code = ErrorCode.AI_PROVIDER_ERROR


class GeminiRateLimitError(AppError):
    status_code = 429
    error_code = ErrorCode.RATE_LIMITED


def _to_gemini_role(role: ChatRole) -> str:
    return "model" if role == ChatRole.ASSISTANT else "user"


async def generate_reply(
    *,
    system_instruction: str,
    history: list[ChatMessage],
    user_message: str,
    model: str,
    api_key: str,
    timeout_seconds: float,
) -> str:
    """Call Gemini's generateContent endpoint and return the assistant's text reply.

    Raises GeminiRateLimitError, MissingApiKeyError, or GeminiProviderError on failure
    so the caller can decide whether to surface the error or degrade to the mock
    provider.
    """
    contents = [
        {"role": _to_gemini_role(m.role), "parts": [{"text": m.content}]} for m in history
    ]
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "topP": 0.9,
            "maxOutputTokens": 1024,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, params={"key": api_key}, json=payload)
    except httpx.TimeoutException as exc:
        raise GeminiProviderError("The AI assistant timed out. Please try again.", detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise GeminiProviderError("Could not reach the Gemini API.", detail=str(exc)) from exc

    if response.status_code == 429:
        raise GeminiRateLimitError(
            "The Gemini API rate limit was reached.", detail="Please wait a moment and try again."
        )
    if response.status_code in (401, 403):
        raise MissingApiKeyError(
            "The Gemini API key is missing, invalid, or lacks permission.", detail=response.text[:500]
        )
    if response.status_code >= 400:
        logger.warning("Gemini API error %s: %s", response.status_code, response.text[:500])
        raise GeminiProviderError(
            f"Gemini API returned an error (status {response.status_code}).", detail=response.text[:500]
        )

    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        block_reason = (data.get("promptFeedback") or {}).get("blockReason")
        raise GeminiProviderError(
            "Gemini did not return a response.", detail=f"block_reason={block_reason}" if block_reason else None
        )

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        finish_reason = candidates[0].get("finishReason", "unknown")
        raise GeminiProviderError(f"Gemini returned an empty response (finish_reason={finish_reason}).")

    return text

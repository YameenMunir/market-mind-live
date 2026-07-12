"""Thin client for the Google Gemini "generateContent" REST API.

Deliberately implemented over plain `httpx` (already a dependency) rather than the
`google-generativeai` SDK, to avoid pulling in an extra heavyweight package for what
is a single JSON endpoint. Only called from the backend - the API key never reaches
the frontend.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

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


async def stream_reply(
    *,
    system_instruction: str,
    history: list[ChatMessage],
    user_message: str,
    model: str,
    api_key: str,
    timeout_seconds: float,
) -> AsyncIterator[str]:
    """Streams the assistant's reply from Gemini's `streamGenerateContent` endpoint,
    yielding each incremental text delta as it arrives instead of waiting for the full
    response like `generate_reply`. Uses `alt=sse` so Gemini itself frames the response
    as standard `data: {...}` Server-Sent Events, which pairs directly with httpx's
    `aiter_lines()`.

    Raises the same GeminiRateLimitError / MissingApiKeyError / GeminiProviderError as
    `generate_reply` for a failure before any text has been yielded. A failure *after*
    some text has already been yielded (e.g. the connection drops mid-stream) still
    raises - the caller is responsible for deciding what to do with the partial text
    already seen, since it can't be un-yielded.
    """
    contents = [
        {"role": _to_gemini_role(m.role), "parts": [{"text": m.content}]} for m in history
    ]
    contents.append({"role": "user", "parts": [{"text": user_message}]})

    url = f"{GEMINI_API_BASE}/models/{model}:streamGenerateContent"
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
            async with client.stream(
                "POST", url, params={"key": api_key, "alt": "sse"}, json=payload
            ) as response:
                if response.status_code == 429:
                    raise GeminiRateLimitError(
                        "The Gemini API rate limit was reached.", detail="Please wait a moment and try again."
                    )
                if response.status_code in (401, 403):
                    body = (await response.aread())[:500]
                    raise MissingApiKeyError(
                        "The Gemini API key is missing, invalid, or lacks permission.",
                        detail=body.decode(errors="replace"),
                    )
                if response.status_code >= 400:
                    body = (await response.aread())[:500]
                    logger.warning("Gemini streaming API error %s: %s", response.status_code, body)
                    raise GeminiProviderError(
                        f"Gemini API returned an error (status {response.status_code}).",
                        detail=body.decode(errors="replace"),
                    )

                got_any_text = False
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[len("data:"):].strip()
                    if not raw:
                        continue
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    candidates = data.get("candidates") or []
                    if not candidates:
                        continue
                    parts = (candidates[0].get("content") or {}).get("parts") or []
                    text = "".join(part.get("text", "") for part in parts)
                    if text:
                        got_any_text = True
                        yield text

                if not got_any_text:
                    raise GeminiProviderError("Gemini did not return a response.")
    except httpx.TimeoutException as exc:
        raise GeminiProviderError("The AI assistant timed out. Please try again.", detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise GeminiProviderError("Could not reach the Gemini API.", detail=str(exc)) from exc

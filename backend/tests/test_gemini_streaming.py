"""Covers gemini_service.stream_reply's SSE parsing and error mapping - the
generate_reply (non-streaming) equivalents of these failure modes are exercised
end-to-end via test_provider_resilience.py's analyst/news/rating-change tests, but
stream_reply's incremental parsing (aiter_lines + a status check available before the
body is consumed) is new, hand-rolled logic worth covering directly.

No pytest-asyncio in this project's dev dependencies (nothing async has needed direct
testing before now) - `asyncio.run()` drives each async generator to completion
instead, rather than adding a new test-only dependency for one test file.
"""

from __future__ import annotations

import asyncio
import json

import pytest

import services.gemini_service as gemini_service
from utils.errors import MissingApiKeyError


class _FakeStreamResponse:
    def __init__(self, status_code: int, lines: list[str], body: bytes = b"") -> None:
        self.status_code = status_code
        self._lines = lines
        self._body = body

    async def aiter_lines(self):
        for line in self._lines:
            yield line

    async def aread(self) -> bytes:
        return self._body


class _FakeStreamContextManager:
    def __init__(self, response: _FakeStreamResponse) -> None:
        self._response = response

    async def __aenter__(self) -> _FakeStreamResponse:
        return self._response

    async def __aexit__(self, *exc_info) -> bool:
        return False


class _FakeAsyncClient:
    def __init__(self, response: _FakeStreamResponse) -> None:
        self._response = response

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *exc_info) -> bool:
        return False

    def stream(self, method, url, **kwargs):
        return _FakeStreamContextManager(self._response)


def _sse_lines(*texts: str) -> list[str]:
    """Builds the line sequence httpx's aiter_lines() would yield for a Gemini
    `alt=sse` stream carrying the given text deltas, one per event."""
    lines: list[str] = []
    for text in texts:
        payload = {"candidates": [{"content": {"parts": [{"text": text}]}}]}
        lines.append(f"data: {json.dumps(payload)}")
        lines.append("")
    return lines


async def _collect(agen) -> list[str]:
    return [piece async for piece in agen]


def _stream_reply(**overrides):
    kwargs = dict(
        system_instruction="sys", history=[], user_message="hi", model="m", api_key="k", timeout_seconds=5.0
    )
    kwargs.update(overrides)
    return gemini_service.stream_reply(**kwargs)


def test_stream_reply_yields_each_text_delta(monkeypatch):
    response = _FakeStreamResponse(200, _sse_lines("Hello ", "world!"))
    monkeypatch.setattr(gemini_service.httpx, "AsyncClient", lambda **kwargs: _FakeAsyncClient(response))

    pieces = asyncio.run(_collect(_stream_reply()))
    assert pieces == ["Hello ", "world!"]
    assert "".join(pieces) == "Hello world!"


def test_stream_reply_ignores_blank_and_malformed_lines(monkeypatch):
    lines = ["", "not json at all", "data: not valid json either", *_sse_lines("ok")]
    response = _FakeStreamResponse(200, lines)
    monkeypatch.setattr(gemini_service.httpx, "AsyncClient", lambda **kwargs: _FakeAsyncClient(response))

    pieces = asyncio.run(_collect(_stream_reply()))
    assert pieces == ["ok"]


def test_stream_reply_raises_rate_limited_on_429_before_yielding(monkeypatch):
    response = _FakeStreamResponse(429, _sse_lines("should not be seen"))
    monkeypatch.setattr(gemini_service.httpx, "AsyncClient", lambda **kwargs: _FakeAsyncClient(response))

    async def _run():
        await _stream_reply().__anext__()

    with pytest.raises(gemini_service.GeminiRateLimitError):
        asyncio.run(_run())


def test_stream_reply_raises_missing_api_key_on_403(monkeypatch):
    response = _FakeStreamResponse(403, [], body=b"permission denied")
    monkeypatch.setattr(gemini_service.httpx, "AsyncClient", lambda **kwargs: _FakeAsyncClient(response))

    async def _run():
        await _stream_reply(api_key="bad-key").__anext__()

    with pytest.raises(MissingApiKeyError):
        asyncio.run(_run())


def test_stream_reply_raises_provider_error_when_no_text_ever_arrives(monkeypatch):
    """A 200 response whose events never carry any candidate text (e.g. purely safety-
    blocked output) must not silently resolve as an empty success - the caller
    (handle_chat_stream) treats "no text yielded at all" as a hard failure requiring
    fallback, same as generate_reply's non-streaming equivalent."""
    response = _FakeStreamResponse(200, [])
    monkeypatch.setattr(gemini_service.httpx, "AsyncClient", lambda **kwargs: _FakeAsyncClient(response))

    async def _run():
        await _stream_reply().__anext__()

    with pytest.raises(gemini_service.GeminiProviderError):
        asyncio.run(_run())

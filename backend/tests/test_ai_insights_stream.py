"""Covers ai_insights_service.handle_chat_stream's event sequencing and fallback
logic. chat_store is mocked out here rather than exercised against the real dev
database (no existing test in this suite writes to chat_store, and this is about
handle_chat_stream's own orchestration - rate limiting, chunking, persistence timing -
not chat_store's own already-implicit correctness).
"""

from __future__ import annotations

import asyncio

import services.ai_insights_service as ai_insights_service
from models.schemas import AIAssetContext, ChatRequest


class _FakeChatStore:
    def __init__(self) -> None:
        self.appended: list[tuple] = []
        self.touched: list[tuple] = []

    def get_history(self, session_id, limit=None):
        return []

    def append(self, session_id, message):
        self.appended.append((session_id, message))

    def touch(self, session_id, **kwargs):
        self.touched.append((session_id, kwargs))


class _AlwaysAllowLimiter:
    def check(self, key):
        return True


class _AlwaysDenyLimiter:
    def check(self, key):
        return False


async def _collect(agen) -> list[dict]:
    return [event async for event in agen]


def _make_context() -> AIAssetContext:
    return AIAssetContext(asset="AAPL", asset_name="Apple Inc.")


def test_handle_chat_stream_mock_path_chunks_and_persists(monkeypatch):
    fake_store = _FakeChatStore()
    monkeypatch.setattr(ai_insights_service, "chat_store", fake_store)
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysAllowLimiter())
    monkeypatch.setattr(ai_insights_service, "resolve_context", lambda asset, client_context: _make_context())
    monkeypatch.setattr(ai_insights_service, "_resolve_gemini_api_key", lambda device_id, settings: None)
    mock_reply = "This is a mock reply with several words in it."
    monkeypatch.setattr(
        ai_insights_service.mock_ai_provider,
        "generate_mock_reply",
        lambda context, message, history: mock_reply,
    )

    request = ChatRequest(session_id="sess-1", message="What's the signal?", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_chat_stream(request, "device-1")))

    chunk_events = [e for e in events if e["type"] == "chunk"]
    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    assert done_events[0]["provider"] == "mock"
    assert done_events[0]["session_id"] == "sess-1"
    # Chunking must reconstruct the original text exactly - no dropped/duplicated
    # words at chunk boundaries.
    assert "".join(e["text"] for e in chunk_events) == mock_reply
    # A genuine progressive reveal, not one flat blob disguised as "streaming".
    assert len(chunk_events) > 1

    assert len(fake_store.appended) == 2
    user_session_id, user_msg = fake_store.appended[0]
    assistant_session_id, assistant_msg = fake_store.appended[1]
    assert user_session_id == assistant_session_id == "sess-1"
    assert user_msg.role.value == "user"
    assert user_msg.content == "What's the signal?"
    assert assistant_msg.role.value == "assistant"
    assert assistant_msg.content == mock_reply
    assert assistant_msg.message_id == done_events[0]["message_id"]
    assert len(fake_store.touched) == 1


def test_handle_chat_stream_rate_limited_yields_single_error_and_persists_nothing(monkeypatch):
    fake_store = _FakeChatStore()
    monkeypatch.setattr(ai_insights_service, "chat_store", fake_store)
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysDenyLimiter())

    request = ChatRequest(session_id="sess-2", message="hi", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_chat_stream(request, "device-1")))

    assert len(events) == 1
    assert events[0] == {
        "type": "error",
        "error_code": "rate_limited",
        "message": "You're sending messages too quickly.",
    }
    assert fake_store.appended == []
    assert fake_store.touched == []

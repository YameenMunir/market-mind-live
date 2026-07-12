"""Covers ai_insights_service.handle_chat_stream/handle_regenerate_stream's event
sequencing and fallback logic. chat_store is mocked out here rather than exercised
against the real dev database (no existing test in this suite writes to chat_store,
and this is about the service functions' own orchestration - rate limiting, chunking,
persistence timing - not chat_store's own already-implicit correctness).
"""

from __future__ import annotations

import asyncio

import services.ai_insights_service as ai_insights_service
from models.schemas import AIAssetContext, ChatMessage, ChatRequest, ChatRole, RegenerateRequest


class _FakeChatStore:
    def __init__(self, seed_history: list[ChatMessage] | None = None) -> None:
        self.appended: list[tuple] = []
        self.touched: list[tuple] = []
        self.deleted: list[tuple] = []
        self._history = list(seed_history or [])

    def get_history(self, session_id, limit=None):
        history = self._history
        if limit is not None and limit > 0:
            return history[-limit:]
        return history

    def append(self, session_id, message):
        self.appended.append((session_id, message))
        self._history.append(message)

    def touch(self, session_id, **kwargs):
        self.touched.append((session_id, kwargs))

    def delete_message(self, session_id, message_id):
        self.deleted.append((session_id, message_id))
        before = len(self._history)
        self._history = [m for m in self._history if m.message_id != message_id]
        return len(self._history) < before


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


def test_handle_regenerate_stream_replaces_stale_reply_without_duplicating_question(monkeypatch):
    stale_reply = ChatMessage(
        message_id="stale-assistant-1", role=ChatRole.ASSISTANT, content="Old, worse answer.", created_at="t2"
    )
    seed = [
        ChatMessage(message_id="user-1", role=ChatRole.USER, content="What's the signal?", created_at="t1"),
        stale_reply,
    ]
    fake_store = _FakeChatStore(seed_history=seed)
    monkeypatch.setattr(ai_insights_service, "chat_store", fake_store)
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysAllowLimiter())
    monkeypatch.setattr(ai_insights_service, "resolve_context", lambda asset, client_context: _make_context())
    monkeypatch.setattr(ai_insights_service, "_resolve_gemini_api_key", lambda device_id, settings: None)
    new_reply = "This is a fresh, better answer with several words."
    seen_calls = []
    monkeypatch.setattr(
        ai_insights_service.mock_ai_provider,
        "generate_mock_reply",
        lambda context, message, history: (seen_calls.append((message, list(history))), new_reply)[1],
    )

    request = RegenerateRequest(session_id="sess-3", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_regenerate_stream(request, "device-1")))

    done_events = [e for e in events if e["type"] == "done"]
    chunk_events = [e for e in events if e["type"] == "chunk"]
    assert len(done_events) == 1
    assert "".join(e["text"] for e in chunk_events) == new_reply

    # The stale reply was deleted, never re-added; no duplicate user question either.
    assert fake_store.deleted == [("sess-3", "stale-assistant-1")]
    assert len(fake_store.appended) == 1
    session_id, appended_msg = fake_store.appended[0]
    assert session_id == "sess-3"
    assert appended_msg.role == ChatRole.ASSISTANT
    assert appended_msg.content == new_reply
    assert appended_msg.message_id != "stale-assistant-1"
    assert appended_msg.message_id == done_events[0]["message_id"]

    # Re-answered using the original question, with history excluding the now-deleted
    # stale reply (it shouldn't see its own discarded answer as prior context).
    assert len(seen_calls) == 1
    reused_message, history_seen = seen_calls[0]
    assert reused_message == "What's the signal?"
    assert stale_reply not in history_seen


def test_handle_regenerate_stream_with_no_prior_question_yields_validation_error(monkeypatch):
    fake_store = _FakeChatStore(seed_history=[])
    monkeypatch.setattr(ai_insights_service, "chat_store", fake_store)
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysAllowLimiter())

    request = RegenerateRequest(session_id="sess-4", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_regenerate_stream(request, "device-1")))

    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert events[0]["error_code"] == "validation_error"
    assert fake_store.appended == []
    assert fake_store.deleted == []


def test_handle_regenerate_stream_rate_limited_yields_single_error(monkeypatch):
    fake_store = _FakeChatStore()
    monkeypatch.setattr(ai_insights_service, "chat_store", fake_store)
    monkeypatch.setattr(ai_insights_service, "_chat_rate_limiter", _AlwaysDenyLimiter())

    request = RegenerateRequest(session_id="sess-5", asset="AAPL")
    events = asyncio.run(_collect(ai_insights_service.handle_regenerate_stream(request, "device-1")))

    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert events[0]["error_code"] == "rate_limited"
    assert fake_store.appended == []
    assert fake_store.deleted == []
    assert fake_store.touched == []

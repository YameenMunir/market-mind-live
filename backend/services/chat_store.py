"""In-memory storage for AI Insights chat sessions and feedback.

Same tradeoff as `prediction/history_store.py`: resets on server restart, which is
fine for a demo/dev deployment. Swap for a real database table (session_id indexed,
plus a user/account column once auth exists) if conversations need to survive
restarts or be scoped per-user rather than shared across the whole running process.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock

from models.schemas import ChatMessage, ChatSessionSummary, FeedbackRating, RiskLevel

_MAX_MESSAGES_PER_SESSION = 200


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class SessionMeta:
    session_id: str
    asset: str
    asset_name: str | None = None
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)
    last_message_preview: str = ""
    signal: str | None = None
    risk_level: RiskLevel | None = None


class ChatSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, list[ChatMessage]] = defaultdict(list)
        self._meta: dict[str, SessionMeta] = {}
        self._lock = Lock()

    def ensure_meta(self, session_id: str, asset: str, asset_name: str | None) -> None:
        with self._lock:
            if session_id not in self._meta:
                self._meta[session_id] = SessionMeta(session_id=session_id, asset=asset, asset_name=asset_name)

    def append(self, session_id: str, message: ChatMessage) -> None:
        with self._lock:
            messages = self._sessions[session_id]
            messages.append(message)
            if len(messages) > _MAX_MESSAGES_PER_SESSION:
                del messages[0]

    def touch(
        self,
        session_id: str,
        *,
        asset: str,
        asset_name: str | None,
        preview: str,
        signal: str | None,
        risk_level: RiskLevel | None,
    ) -> None:
        """Updates a session's summary metadata after a new message - called once per
        chat turn so `list_sessions()` can render an up-to-date preview/badges without
        re-scanning the full message list on every request."""
        with self._lock:
            meta = self._meta.get(session_id)
            if meta is None:
                meta = SessionMeta(session_id=session_id, asset=asset, asset_name=asset_name)
                self._meta[session_id] = meta
            meta.asset = asset
            meta.asset_name = asset_name
            meta.updated_at = _now_iso()
            meta.last_message_preview = preview[:160]
            meta.signal = signal
            meta.risk_level = risk_level

    def get_history(self, session_id: str, limit: int | None = None) -> list[ChatMessage]:
        with self._lock:
            messages = list(self._sessions.get(session_id, []))
        if limit is not None and limit > 0:
            return messages[-limit:]
        return messages

    def get_meta(self, session_id: str) -> SessionMeta | None:
        with self._lock:
            return self._meta.get(session_id)

    def list_sessions(self) -> list[ChatSessionSummary]:
        with self._lock:
            metas = list(self._meta.values())
            counts = {sid: len(msgs) for sid, msgs in self._sessions.items()}
        summaries = [
            ChatSessionSummary(
                session_id=m.session_id,
                asset=m.asset,
                asset_name=m.asset_name,
                created_at=m.created_at,
                updated_at=m.updated_at,
                last_message_preview=m.last_message_preview,
                signal=m.signal,
                risk_level=m.risk_level,
                message_count=counts.get(m.session_id, 0),
            )
            for m in metas
        ]
        summaries.sort(key=lambda s: s.updated_at, reverse=True)
        return summaries

    def delete(self, session_id: str) -> bool:
        with self._lock:
            existed = session_id in self._sessions or session_id in self._meta
            self._sessions.pop(session_id, None)
            self._meta.pop(session_id, None)
            return existed


@dataclass
class FeedbackEntry:
    session_id: str
    message_id: str
    rating: FeedbackRating
    comment: str | None
    created_at: str = field(default_factory=_now_iso)


class FeedbackStore:
    """Stores validated (not auto-applied) user feedback on assistant answers.

    Feedback is never used to automatically alter model behaviour - it's a queue for
    human review, informing future prompt/knowledge-base updates or fine-tuning
    datasets, per the "no unsupervised self-retraining" requirement.
    """

    def __init__(self) -> None:
        self._entries: list[FeedbackEntry] = []
        self._lock = Lock()

    def record(self, entry: FeedbackEntry) -> None:
        with self._lock:
            self._entries.append(entry)

    def get_analytics(self) -> dict:
        with self._lock:
            entries = list(self._entries)
        up = sum(1 for e in entries if e.rating == FeedbackRating.UP)
        down = sum(1 for e in entries if e.rating == FeedbackRating.DOWN)
        return {
            "total_feedback": len(entries),
            "thumbs_up": up,
            "thumbs_down": down,
            "satisfaction_pct": round(up / len(entries) * 100, 1) if entries else None,
        }


chat_store = ChatSessionStore()
feedback_store = FeedbackStore()

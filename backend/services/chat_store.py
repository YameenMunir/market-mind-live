"""In-memory storage for AI Insights chat sessions and feedback.

Same tradeoff as `prediction/history_store.py`: resets on server restart, which is
fine for a demo/dev deployment. Swap for a real database table (session_id indexed)
if conversations need to survive restarts or be queried across instances.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock

from models.schemas import ChatMessage, FeedbackRating

_MAX_MESSAGES_PER_SESSION = 200


class ChatSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, list[ChatMessage]] = defaultdict(list)
        self._lock = Lock()

    def append(self, session_id: str, message: ChatMessage) -> None:
        with self._lock:
            messages = self._sessions[session_id]
            messages.append(message)
            if len(messages) > _MAX_MESSAGES_PER_SESSION:
                del messages[0]

    def get_history(self, session_id: str, limit: int | None = None) -> list[ChatMessage]:
        with self._lock:
            messages = list(self._sessions.get(session_id, []))
        if limit is not None and limit > 0:
            return messages[-limit:]
        return messages


@dataclass
class FeedbackEntry:
    session_id: str
    message_id: str
    rating: FeedbackRating
    comment: str | None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


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

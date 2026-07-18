"""Database-backed storage for AI Insights chat sessions and feedback, scoped per
device. Session/message rows are indexed by `session_id` (still the primary lookup
key everywhere, matching the original in-memory access pattern); `device_id` is used
only to scope `list_sessions()` to the device that created them - a session's
`session_id` is still sufficient on its own to read/append/delete it directly, exactly
as before this migration (no new authorization checks are being added here).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlmodel import Session, func, select

from api.deps import ANONYMOUS_DEVICE_ID
from db.models import ChatFeedbackRecord, ChatMessageRecord, ChatSessionRecord
from db.session import engine
from models.schemas import ChatMessage, ChatRole, ChatSessionSummary, FeedbackRating, RiskLevel

_MAX_MESSAGES_PER_SESSION = 200


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class SessionMeta:
    session_id: str
    asset: str
    asset_name: str | None = None
    created_at: str = ""
    updated_at: str = ""
    last_message_preview: str = ""
    signal: str | None = None
    risk_level: RiskLevel | None = None


def _meta_from_record(record: ChatSessionRecord) -> SessionMeta:
    return SessionMeta(
        session_id=record.session_id,
        asset=record.asset,
        asset_name=record.asset_name,
        created_at=record.created_at,
        updated_at=record.updated_at,
        last_message_preview=record.last_message_preview,
        signal=record.signal,
        risk_level=RiskLevel(record.risk_level) if record.risk_level else None,
    )


def _message_from_record(record: ChatMessageRecord) -> ChatMessage:
    return ChatMessage(
        message_id=record.message_id,
        role=ChatRole(record.role),
        content=record.content,
        created_at=record.created_at,
    )


class ChatSessionStore:
    def ensure_meta(self, session_id: str, asset: str, asset_name: str | None, device_id: str = ANONYMOUS_DEVICE_ID) -> None:
        with Session(engine) as session:
            if session.get(ChatSessionRecord, session_id) is None:
                session.add(ChatSessionRecord(session_id=session_id, device_id=device_id, asset=asset, asset_name=asset_name))
                session.commit()

    def append(self, session_id: str, message: ChatMessage) -> None:
        with Session(engine) as session:
            session.add(
                ChatMessageRecord(
                    message_id=message.message_id,
                    session_id=session_id,
                    role=message.role.value,
                    content=message.content,
                    created_at=message.created_at,
                )
            )
            session.commit()

            # A single scalar COUNT rather than loading every row for this session
            # just to measure its length - matters here since this runs on every
            # single chat message, not just occasionally.
            total = session.exec(
                select(func.count()).select_from(ChatMessageRecord).where(ChatMessageRecord.session_id == session_id)
            ).one()
            overflow = total - _MAX_MESSAGES_PER_SESSION
            if overflow > 0:
                oldest = session.exec(
                    select(ChatMessageRecord)
                    .where(ChatMessageRecord.session_id == session_id)
                    .order_by(ChatMessageRecord.created_at)
                    .limit(overflow)
                ).all()
                for old in oldest:
                    session.delete(old)
                session.commit()

    def touch(
        self,
        session_id: str,
        *,
        asset: str,
        asset_name: str | None,
        preview: str,
        signal: str | None,
        risk_level: RiskLevel | None,
        device_id: str = ANONYMOUS_DEVICE_ID,
    ) -> None:
        """Updates a session's summary metadata after a new message - called once per
        chat turn so `list_sessions()` can render an up-to-date preview/badges without
        re-scanning the full message list on every request. Creates the session row if
        it doesn't already exist (e.g. the very first turn of a new session)."""
        with Session(engine) as session:
            record = session.get(ChatSessionRecord, session_id)
            if record is None:
                record = ChatSessionRecord(session_id=session_id, device_id=device_id, asset=asset, asset_name=asset_name)
            record.asset = asset
            record.asset_name = asset_name
            record.updated_at = _now_iso()
            record.last_message_preview = preview[:160]
            record.signal = signal
            record.risk_level = risk_level.value if risk_level else None
            session.add(record)
            session.commit()

    def get_history(self, session_id: str, limit: int | None = None) -> list[ChatMessage]:
        with Session(engine) as session:
            records = session.exec(
                select(ChatMessageRecord)
                .where(ChatMessageRecord.session_id == session_id)
                .order_by(ChatMessageRecord.created_at)
            ).all()
        messages = [_message_from_record(r) for r in records]
        if limit is not None and limit > 0:
            return messages[-limit:]
        return messages

    def get_meta(self, session_id: str) -> SessionMeta | None:
        with Session(engine) as session:
            record = session.get(ChatSessionRecord, session_id)
        return _meta_from_record(record) if record else None

    def list_sessions(self, device_id: str) -> list[ChatSessionSummary]:
        with Session(engine) as session:
            metas = session.exec(select(ChatSessionRecord).where(ChatSessionRecord.device_id == device_id)).all()
            session_ids = [m.session_id for m in metas]
            counts: dict[str, int] = {}
            if session_ids:
                # One grouped COUNT for every session instead of a separate query per
                # session (the previous N+1 pattern) - this endpoint is a simple list
                # view, so its cost shouldn't scale with how many messages exist.
                rows = session.exec(
                    select(ChatMessageRecord.session_id, func.count())
                    .where(ChatMessageRecord.session_id.in_(session_ids))
                    .group_by(ChatMessageRecord.session_id)
                ).all()
                counts = dict(rows)
        summaries = [
            ChatSessionSummary(
                session_id=m.session_id,
                asset=m.asset,
                asset_name=m.asset_name,
                created_at=m.created_at,
                updated_at=m.updated_at,
                last_message_preview=m.last_message_preview,
                signal=m.signal,
                risk_level=RiskLevel(m.risk_level) if m.risk_level else None,
                message_count=counts.get(m.session_id, 0),
            )
            for m in metas
        ]
        summaries.sort(key=lambda s: s.updated_at, reverse=True)
        return summaries

    def delete(self, session_id: str) -> bool:
        with Session(engine) as session:
            record = session.get(ChatSessionRecord, session_id)
            messages = session.exec(select(ChatMessageRecord).where(ChatMessageRecord.session_id == session_id)).all()
            existed = record is not None or bool(messages)
            for message in messages:
                session.delete(message)
            if record is not None:
                session.delete(record)
            session.commit()
            return existed

    def delete_message(self, session_id: str, message_id: str) -> bool:
        """Removes a single message row - used by regenerate to discard the stale
        assistant reply being replaced, without touching the rest of the session."""
        with Session(engine) as session:
            record = session.exec(
                select(ChatMessageRecord).where(
                    ChatMessageRecord.session_id == session_id, ChatMessageRecord.message_id == message_id
                )
            ).first()
            if record is None:
                return False
            session.delete(record)
            session.commit()
            return True


@dataclass
class FeedbackEntry:
    session_id: str
    message_id: str
    rating: FeedbackRating
    comment: str | None
    created_at: str = ""


class FeedbackStore:
    """Stores validated (not auto-applied) user feedback on assistant answers.

    Feedback is never used to automatically alter model behaviour - it's a queue for
    human review, informing future prompt/knowledge-base updates or fine-tuning
    datasets, per the "no unsupervised self-retraining" requirement.
    """

    def record(self, entry: FeedbackEntry) -> None:
        with Session(engine) as session:
            session.add(
                ChatFeedbackRecord(
                    session_id=entry.session_id,
                    message_id=entry.message_id,
                    rating=entry.rating.value,
                    comment=entry.comment,
                    created_at=entry.created_at or _now_iso(),
                )
            )
            session.commit()

    def get_analytics(self) -> dict:
        # Grouped COUNT rather than loading every feedback row into memory just to
        # tally two buckets - this table only grows over the app's lifetime.
        with Session(engine) as session:
            rows = dict(
                session.exec(
                    select(ChatFeedbackRecord.rating, func.count()).group_by(ChatFeedbackRecord.rating)
                ).all()
            )
        up = rows.get(FeedbackRating.UP.value, 0)
        down = rows.get(FeedbackRating.DOWN.value, 0)
        total = sum(rows.values())
        return {
            "total_feedback": total,
            "thumbs_up": up,
            "thumbs_down": down,
            "satisfaction_pct": round(up / total * 100, 1) if total else None,
        }


chat_store = ChatSessionStore()
feedback_store = FeedbackStore()

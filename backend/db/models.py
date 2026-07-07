"""Database tables backing the app's persistence layer.

Kept separate from `models/schemas.py`, which stays the single source of truth for
API request/response shapes (per existing convention) - these mirror those shapes
plus whatever extra columns (device scoping, autoincrement PKs) persistence needs.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Device(SQLModel, table=True):
    """One row per browser that has ever called the API, identified by the
    frontend-generated `X-Device-Id` header (see backend/api/deps.py). Anonymous by
    design - no email/password - just enough identity to scope alerts/chat sessions
    to the client that created them instead of sharing them process-wide."""

    id: str = Field(primary_key=True)
    created_at: str = Field(default_factory=_now_iso)
    last_seen_at: str = Field(default_factory=_now_iso)


class AlertRecord(SQLModel, table=True):
    __tablename__ = "alertrecord"

    id: str = Field(primary_key=True)
    device_id: str = Field(foreign_key="device.id", index=True)
    symbol: str = Field(index=True)
    asset_name: str | None = None
    condition: str
    threshold: float | None = None
    baseline_value: str | None = None
    note: str | None = None
    status: str
    created_at: str = Field(default_factory=_now_iso)
    triggered_at: str | None = None
    triggered_message: str | None = None


class ChatSessionRecord(SQLModel, table=True):
    __tablename__ = "chatsessionrecord"

    session_id: str = Field(primary_key=True)
    device_id: str = Field(foreign_key="device.id", index=True)
    asset: str
    asset_name: str | None = None
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)
    last_message_preview: str = ""
    signal: str | None = None
    risk_level: str | None = None


class ChatMessageRecord(SQLModel, table=True):
    __tablename__ = "chatmessagerecord"

    message_id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="chatsessionrecord.session_id", index=True)
    role: str
    content: str
    created_at: str = Field(default_factory=_now_iso)


class ChatFeedbackRecord(SQLModel, table=True):
    __tablename__ = "chatfeedbackrecord"

    id: int | None = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    message_id: str
    rating: str
    comment: str | None = None
    created_at: str = Field(default_factory=_now_iso)


class UserSettingsRecord(SQLModel, table=True):
    __tablename__ = "usersettingsrecord"

    device_id: str = Field(primary_key=True, foreign_key="device.id")
    experience_mode: str = Field(default="advanced")


class PredictionHistoryRecord(SQLModel, table=True):
    """Global engine-performance data, not per-device - a prediction's accuracy
    doesn't depend on who was looking at the dashboard when it was made."""

    __tablename__ = "predictionhistoryrecord"

    id: int | None = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    direction: str
    confidence: float
    price_at_prediction: float
    generated_at: str

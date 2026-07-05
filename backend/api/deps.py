"""Shared FastAPI dependencies for request-scoped DB access and device identity."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, Header
from sqlmodel import Session

from db.models import Device
from db.session import get_session

ANONYMOUS_DEVICE_ID = "anonymous"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_device_id(
    x_device_id: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> str:
    """Resolves the calling browser's device id from the `X-Device-Id` header (set by
    `frontend/src/lib/api.ts` from a value `useDeviceId.ts` persists in localStorage),
    upserting a `Device` row so alerts/chat sessions can be scoped to the client that
    created them. Falls back to a shared `ANONYMOUS_DEVICE_ID` row for callers that
    don't send the header (curl, older cached frontend builds) rather than rejecting
    the request - there's no auth to enforce here, just best-effort scoping.
    """
    device_id = x_device_id or ANONYMOUS_DEVICE_ID
    device = session.get(Device, device_id)
    if device is None:
        device = Device(id=device_id)
        session.add(device)
    else:
        device.last_seen_at = _now_iso()
        session.add(device)
    session.commit()
    return device_id

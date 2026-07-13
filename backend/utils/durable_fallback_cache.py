"""Disk-backed companion to the "stale beats absent" fallback caches in
services/news_service.py, services/rating_change_service.py, and
services/analyst_service.py.

Those services already keep a long-lived fallback entry in the in-process
`utils.cache.TTLCache` so a rate-limited/erroring live refetch can still serve
recent data instead of a hard error. That cache is pure in-memory, so it's empty
after every process restart - on a host that cold-starts after idle (e.g. Render's
free tier), the first request after a cold start has nothing to fall back to if the
provider is rate-limited right then. This module mirrors the same fallback value
into SQLite (db.models.FallbackCacheRecord) on every successful fetch, so it
survives a restart even though the in-memory copy doesn't.

Deliberately narrow (get/set by key, caller handles (de)serialization) rather than
folding into `utils.cache.TTLCache` itself - the in-memory cache is on the hot path
for every request and must stay fast/lock-based; this is only ever touched on a
successful fetch (write) or an already-erroring fallback path (read), so a DB
round-trip there is negligible.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import TypeVar

from pydantic import BaseModel
from sqlmodel import Session

from db.models import FallbackCacheRecord
from db.session import engine

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def durable_set(key: str, value: BaseModel) -> None:
    payload_json = value.model_dump_json()
    try:
        with Session(engine) as session:
            record = session.get(FallbackCacheRecord, key)
            if record is None:
                record = FallbackCacheRecord(key=key, payload_json=payload_json)
            else:
                record.payload_json = payload_json
                record.updated_at = _now_iso()
            session.add(record)
            session.commit()
    except Exception:
        # Durable persistence is a best-effort backstop for the in-memory fallback,
        # never a hard requirement for the request that's already succeeding - a
        # write failure here must not turn a successful live fetch into an error.
        logger.exception("Failed to persist durable fallback cache entry for key=%s", key)


def durable_get(key: str, model_cls: type[T]) -> T | None:
    try:
        with Session(engine) as session:
            record = session.get(FallbackCacheRecord, key)
    except Exception:
        logger.exception("Failed to read durable fallback cache entry for key=%s", key)
        return None
    if record is None:
        return None
    try:
        return model_cls.model_validate_json(record.payload_json)
    except Exception:
        logger.exception("Failed to parse durable fallback cache entry for key=%s", key)
        return None

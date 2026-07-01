from __future__ import annotations

import time
from threading import Lock
from typing import Any, Callable, TypeVar

T = TypeVar("T")


class TTLCache:
    """Small in-memory cache with per-key TTL. Good enough for a single-process API server."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at < time.monotonic():
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        with self._lock:
            self._store[key] = (time.monotonic() + ttl_seconds, value)

    def get_or_set(self, key: str, ttl_seconds: float, factory: Callable[[], T]) -> T:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = factory()
        self.set(key, value, ttl_seconds)
        return value


cache = TTLCache()


class RateLimiter:
    """Sliding-window request counter per key (e.g. per symbol or per client)."""

    def __init__(self, max_per_minute: int) -> None:
        self.max_per_minute = max_per_minute
        self._hits: dict[str, list[float]] = {}
        self._lock = Lock()

    def check(self, key: str) -> bool:
        now = time.monotonic()
        window_start = now - 60
        with self._lock:
            hits = [t for t in self._hits.get(key, []) if t > window_start]
            if len(hits) >= self.max_per_minute:
                self._hits[key] = hits
                return False
            hits.append(now)
            self._hits[key] = hits
            return True

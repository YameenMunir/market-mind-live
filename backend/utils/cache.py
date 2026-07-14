from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable, TypeVar

T = TypeVar("T")


@dataclass
class _CacheEntry:
    value: Any
    created_at: float
    expires_at: float


class TTLCache:
    """Small in-memory cache with per-key TTL, plus in-flight request de-duplication.

    Good enough for a single-process API server. Structured so a Redis-backed
    implementation could later swap in behind the same `get`/`set`/`get_or_set`
    interface without touching callers.
    """

    def __init__(self) -> None:
        self._store: dict[str, _CacheEntry] = {}
        self._lock = Lock()
        # Per-key locks held only while a cache-miss is being fetched, so concurrent
        # callers for the *same* cold key block on one another and share a single
        # upstream fetch instead of each independently calling the factory.
        self._inflight_locks: dict[str, Lock] = {}

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.expires_at < time.monotonic():
                del self._store[key]
                return None
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            self._store[key] = _CacheEntry(value=value, created_at=now, expires_at=now + ttl_seconds)

    def get_or_set(self, key: str, ttl_seconds: float, factory: Callable[[], T]) -> T:
        cached = self.get(key)
        if cached is not None:
            return cached

        # Claim (or wait on) this key's in-flight lock so a burst of concurrent
        # requests for the same cold key results in exactly one upstream fetch.
        with self._lock:
            key_lock = self._inflight_locks.get(key)
            if key_lock is None:
                key_lock = Lock()
                self._inflight_locks[key] = key_lock

        try:
            with key_lock:
                # Another thread may have just populated the cache while we were
                # waiting for the lock - check again before calling the factory.
                cached = self.get(key)
                if cached is not None:
                    return cached
                value = factory()
                self.set(key, value, ttl_seconds)
        finally:
            # Always drop the lock entry, including when `factory()` raises (e.g. a
            # rate limit) - otherwise a key that keeps failing never gets cleaned up
            # and accumulates in `_inflight_locks` forever. A new lock is created on
            # demand if this key goes cold again later.
            with self._lock:
                self._inflight_locks.pop(key, None)

        return value

    def entry_age_seconds(self, key: str) -> float | None:
        """Age of the cached value in seconds, or None if the key isn't cached (or expired)."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None or entry.expires_at < time.monotonic():
                return None
            return time.monotonic() - entry.created_at

    def debug_snapshot(self) -> list[dict[str, Any]]:
        """Non-sensitive cache introspection for the `/api/debug/cache` dev endpoint."""
        now = time.monotonic()
        with self._lock:
            return [
                {
                    "key": key,
                    "age_seconds": round(now - entry.created_at, 2),
                    "ttl_seconds": round(entry.expires_at - entry.created_at, 2),
                    "expires_in_seconds": round(entry.expires_at - now, 2),
                    "expired": entry.expires_at < now,
                }
                for key, entry in self._store.items()
            ]


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


class ThrottlingRateLimiter:
    """Token bucket / leaky bucket style scheduling rate limiter that enforces both
    a sliding-window per-minute rate limit and a per-second pacing rate limit.
    If a request is within the timeout, it blocks/sleeps until its slot arrives,
    otherwise returns False.
    """

    def __init__(self, max_per_minute: int, rate_per_second: float) -> None:
        self.max_per_minute = max_per_minute
        self.min_interval = 1.0 / rate_per_second if rate_per_second > 0 else 0.0
        self._lock = Lock()
        self._next_allowed_time: dict[str, float] = {}
        self._hits: dict[str, list[float]] = {}

    def acquire(self, key: str, timeout: float = 5.0) -> bool:
        if self.max_per_minute <= 0:
            return True

        now = time.monotonic()
        with self._lock:
            # 1. Clean up hits older than 60 seconds
            window_start = now - 60.0
            hits = [t for t in self._hits.get(key, []) if t > window_start]

            # 2. Check sliding window limit slot
            if len(hits) >= self.max_per_minute:
                next_window_slot = hits[0] + 60.0
            else:
                next_window_slot = now

            # 3. Check pacing limit slot
            last_allowed = self._next_allowed_time.get(key, 0.0)
            if self.min_interval > 0:
                next_pacing_slot = max(now, last_allowed + self.min_interval)
            else:
                next_pacing_slot = now

            # 4. Schedule the request
            scheduled_time = max(next_window_slot, next_pacing_slot)
            wait_time = scheduled_time - now

            if wait_time > timeout:
                return False

            self._next_allowed_time[key] = scheduled_time
            hits.append(scheduled_time)
            self._hits[key] = hits

        # Sleep outside the lock
        if wait_time > 0:
            time.sleep(wait_time)
        return True

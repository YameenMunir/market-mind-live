"""Lightweight in-process counters for distinguishing our own proactive rate-limiting
from the provider's real 429s, and how often stale fallback data gets served during an
outage - enough visibility to tell "are we over-fetching" from "is Yahoo throttling us"
without pulling in an external metrics stack for a single-process app this size. Reset
on every process restart, same as everything else in utils/cache.py.
"""

from __future__ import annotations

import logging
import threading

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_counters: dict[str, int] = {}


def increment(name: str) -> None:
    with _lock:
        _counters[name] = _counters.get(name, 0) + 1


def snapshot() -> dict[str, int]:
    with _lock:
        return dict(_counters)

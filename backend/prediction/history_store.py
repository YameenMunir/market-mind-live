from __future__ import annotations

from collections import defaultdict
from threading import Lock

from models.schemas import PredictionHistoryEntry, PredictionResult

_MAX_ENTRIES_PER_SYMBOL = 100


class PredictionHistoryStore:
    """In-memory prediction history. Resets on server restart - fine for a demo/dev deployment;
    swap for a real database table if predictions need to persist across restarts."""

    def __init__(self) -> None:
        self._entries: dict[str, list[PredictionHistoryEntry]] = defaultdict(list)
        self._lock = Lock()

    def record(self, prediction: PredictionResult, price: float) -> None:
        entry = PredictionHistoryEntry(
            symbol=prediction.symbol,
            direction=prediction.direction,
            confidence=prediction.confidence,
            price_at_prediction=price,
            generated_at=prediction.generated_at,
        )
        with self._lock:
            entries = self._entries[prediction.symbol]
            entries.append(entry)
            if len(entries) > _MAX_ENTRIES_PER_SYMBOL:
                del entries[0]

    def get_history(self, symbol: str) -> list[PredictionHistoryEntry]:
        with self._lock:
            return list(self._entries.get(symbol.upper(), []))


history_store = PredictionHistoryStore()

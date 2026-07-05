from __future__ import annotations

from sqlmodel import Session, select

from db.models import PredictionHistoryRecord
from db.session import engine
from models.schemas import PredictionDirection, PredictionHistoryEntry, PredictionResult

_MAX_ENTRIES_PER_SYMBOL = 100


def _to_schema(record: PredictionHistoryRecord) -> PredictionHistoryEntry:
    return PredictionHistoryEntry(
        symbol=record.symbol,
        direction=PredictionDirection(record.direction),
        confidence=record.confidence,
        price_at_prediction=record.price_at_prediction,
        generated_at=record.generated_at,
    )


class PredictionHistoryStore:
    """Database-backed prediction history, capped at `_MAX_ENTRIES_PER_SYMBOL` most
    recent entries per symbol - global engine-performance data, not per-device."""

    def record(self, prediction: PredictionResult, price: float) -> None:
        with Session(engine) as session:
            session.add(
                PredictionHistoryRecord(
                    symbol=prediction.symbol,
                    direction=prediction.direction.value,
                    confidence=prediction.confidence,
                    price_at_prediction=price,
                    generated_at=prediction.generated_at,
                )
            )
            existing = session.exec(
                select(PredictionHistoryRecord)
                .where(PredictionHistoryRecord.symbol == prediction.symbol)
                .order_by(PredictionHistoryRecord.id)
            ).all()
            overflow = len(existing) + 1 - _MAX_ENTRIES_PER_SYMBOL
            for old in existing[:overflow] if overflow > 0 else []:
                session.delete(old)
            session.commit()

    def get_history(self, symbol: str) -> list[PredictionHistoryEntry]:
        with Session(engine) as session:
            records = session.exec(
                select(PredictionHistoryRecord)
                .where(PredictionHistoryRecord.symbol == symbol.upper())
                .order_by(PredictionHistoryRecord.id)
            ).all()
        return [_to_schema(r) for r in records]


history_store = PredictionHistoryStore()

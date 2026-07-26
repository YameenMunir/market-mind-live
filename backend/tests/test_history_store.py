"""Regression coverage for the "Unexpected error refreshing live data" bug: a NaN
`price_at_prediction` used to raise an unhandled sqlite3.IntegrityError (NOT NULL
constraint) straight out of `record()`, which services/live_hub.py's poll loop could
only catch as a generic, unclassified internal error. `record()` must instead skip a
non-finite price with a logged warning and leave the rest of the app unaffected.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, select

from db.models import PredictionHistoryRecord
from db.session import engine
from models.schemas import PredictionDirection, PredictionResult
from prediction.history_store import history_store


def _fake_prediction(symbol: str = "TESTSYM") -> PredictionResult:
    return PredictionResult(
        symbol=symbol,
        direction=PredictionDirection.BULLISH,
        confidence=61.0,
        reasoning=["test"],
        beginner_summary="test",
        plain_english_explanation="test",
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _cleanup(symbol: str) -> None:
    with Session(engine) as session:
        for record in session.exec(select(PredictionHistoryRecord).where(PredictionHistoryRecord.symbol == symbol)).all():
            session.delete(record)
        session.commit()


def test_record_skips_nan_price_without_raising():
    symbol = "TESTNAN1"
    try:
        history_store.record(_fake_prediction(symbol), float("nan"))
        assert history_store.get_history(symbol) == []
    finally:
        _cleanup(symbol)


def test_record_skips_infinite_price_without_raising():
    symbol = "TESTINF1"
    try:
        history_store.record(_fake_prediction(symbol), float("inf"))
        assert history_store.get_history(symbol) == []
    finally:
        _cleanup(symbol)


def test_record_still_persists_a_normal_finite_price():
    symbol = "TESTOK1"
    try:
        history_store.record(_fake_prediction(symbol), 123.45)
        history = history_store.get_history(symbol)
        assert len(history) == 1
        assert history[0].price_at_prediction == 123.45
    finally:
        _cleanup(symbol)

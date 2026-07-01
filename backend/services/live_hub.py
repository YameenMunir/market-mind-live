from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from config import get_settings
from models.schemas import IndicatorSet, MarketStatus, PredictionResult, PriceQuote, RiskAssessment
from prediction.engine import generate_prediction
from prediction.history_store import history_store
from services import price_service
from services.indicator_service import compute_indicators
from services.market_status_service import get_market_status
from services.risk_service import compute_risk
from utils.errors import AppError

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class LiveSnapshot:
    """Latest known-good state for a symbol, plus per-section freshness timestamps.

    Sections update at different cadences (quote/status are cheap and refresh often;
    indicators/prediction/risk are derived from daily bars and refresh far less often)
    so each carries its own `updated_at` rather than a single shared timestamp.
    """

    symbol: str
    quote: PriceQuote | None = None
    quote_updated_at: str | None = None
    market_status: MarketStatus | None = None
    market_status_updated_at: str | None = None
    indicators: IndicatorSet | None = None
    indicators_updated_at: str | None = None
    prediction: PredictionResult | None = None
    prediction_updated_at: str | None = None
    risk: RiskAssessment | None = None
    risk_updated_at: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    is_stale: bool = False


class _SymbolWatch:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self.snapshot = LiveSnapshot(symbol=symbol)
        self.subscriber_count = 0
        self.idle_since: float | None = None
        self.task: asyncio.Task | None = None
        self.backoff_seconds = get_settings().hub_quote_interval_seconds


class LiveDataHub:
    """One background poller per actively-watched symbol, shared by every client
    subscribed to it. N dashboards watching the same symbol still cost exactly one
    upstream Yahoo poll - this is what makes a 1s client-facing refresh cadence safe
    without multiplying outbound requests (and tripping rate limits) per viewer.
    """

    def __init__(self) -> None:
        self._watches: dict[str, _SymbolWatch] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, symbol: str) -> None:
        symbol = symbol.upper()
        async with self._lock:
            watch = self._watches.get(symbol)
            if watch is None:
                watch = _SymbolWatch(symbol)
                self._watches[symbol] = watch
            watch.subscriber_count += 1
            watch.idle_since = None
            if watch.task is None or watch.task.done():
                watch.task = asyncio.create_task(self._run(watch), name=f"live-hub:{symbol}")

    async def unsubscribe(self, symbol: str) -> None:
        symbol = symbol.upper()
        async with self._lock:
            watch = self._watches.get(symbol)
            if watch is None:
                return
            watch.subscriber_count = max(0, watch.subscriber_count - 1)
            if watch.subscriber_count == 0:
                watch.idle_since = time.monotonic()

    def get_snapshot(self, symbol: str) -> LiveSnapshot:
        watch = self._watches.get(symbol.upper())
        return watch.snapshot if watch else LiveSnapshot(symbol=symbol.upper())

    async def shutdown(self) -> None:
        """Cancel every running poller task - called on app shutdown so reloads/restarts
        don't leak background asyncio tasks."""
        async with self._lock:
            tasks = [w.task for w in self._watches.values() if w.task and not w.task.done()]
            for task in tasks:
                task.cancel()
            for task in tasks:
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass
            self._watches.clear()

    async def _run(self, watch: _SymbolWatch) -> None:
        settings = get_settings()
        last_analytics_refresh = 0.0

        try:
            while True:
                if watch.subscriber_count == 0 and watch.idle_since is not None:
                    if time.monotonic() - watch.idle_since >= settings.hub_idle_shutdown_seconds:
                        logger.info("Stopping live hub poller for %s (no subscribers)", watch.symbol)
                        return

                try:
                    quote = await asyncio.to_thread(price_service.get_quote, watch.symbol)
                    watch.snapshot.quote = quote
                    watch.snapshot.quote_updated_at = _now_iso()

                    watch.snapshot.market_status = get_market_status(watch.symbol)
                    watch.snapshot.market_status_updated_at = _now_iso()

                    watch.snapshot.error_code = None
                    watch.snapshot.error_message = None
                    watch.snapshot.is_stale = False
                    watch.backoff_seconds = settings.hub_quote_interval_seconds

                    now = time.monotonic()
                    if now - last_analytics_refresh >= settings.hub_indicator_interval_seconds:
                        await self._refresh_analytics(watch)
                        last_analytics_refresh = now
                except AppError as exc:
                    watch.snapshot.error_code = exc.error_code.value
                    watch.snapshot.error_message = exc.message
                    watch.snapshot.is_stale = True
                    watch.backoff_seconds = min(watch.backoff_seconds * 1.5, settings.hub_error_backoff_max_seconds)
                    logger.warning("Live hub error for %s: %s", watch.symbol, exc.message)
                except Exception:
                    watch.snapshot.error_code = "internal_error"
                    watch.snapshot.error_message = "Unexpected error refreshing live data."
                    watch.snapshot.is_stale = True
                    watch.backoff_seconds = min(watch.backoff_seconds * 1.5, settings.hub_error_backoff_max_seconds)
                    logger.exception("Unexpected live hub error for %s", watch.symbol)

                await asyncio.sleep(watch.backoff_seconds)
        except asyncio.CancelledError:
            raise

    async def _refresh_analytics(self, watch: _SymbolWatch) -> None:
        symbol = watch.symbol
        df = await asyncio.to_thread(price_service.get_history_df, symbol, "1y", "1d")

        indicators = compute_indicators(symbol, df)
        price = float(df["Close"].iloc[-1])
        prediction = generate_prediction(symbol, price, indicators)
        risk = compute_risk(symbol, df)
        history_store.record(prediction, price)

        watch.snapshot.indicators = indicators
        watch.snapshot.indicators_updated_at = _now_iso()
        watch.snapshot.prediction = prediction
        watch.snapshot.prediction_updated_at = _now_iso()
        watch.snapshot.risk = risk
        watch.snapshot.risk_updated_at = _now_iso()


hub = LiveDataHub()

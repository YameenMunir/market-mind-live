from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import get_settings
from services.live_hub import hub

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


def _serialize(symbol: str) -> dict:
    snapshot = hub.get_snapshot(symbol)
    return {
        "type": "snapshot",
        "symbol": snapshot.symbol,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "quote": snapshot.quote.model_dump(mode="json") if snapshot.quote else None,
        "quote_updated_at": snapshot.quote_updated_at,
        "market_status": snapshot.market_status.model_dump(mode="json") if snapshot.market_status else None,
        "market_status_updated_at": snapshot.market_status_updated_at,
        "indicators": snapshot.indicators.model_dump(mode="json") if snapshot.indicators else None,
        "indicators_updated_at": snapshot.indicators_updated_at,
        "prediction": snapshot.prediction.model_dump(mode="json") if snapshot.prediction else None,
        "prediction_updated_at": snapshot.prediction_updated_at,
        "risk": snapshot.risk.model_dump(mode="json") if snapshot.risk else None,
        "risk_updated_at": snapshot.risk_updated_at,
        "error_code": snapshot.error_code,
        "error_message": snapshot.error_message,
        "is_stale": snapshot.is_stale,
    }


@router.websocket("/ws/live/{symbol}")
async def live_feed(websocket: WebSocket, symbol: str):
    await websocket.accept()
    await hub.subscribe(symbol)
    try:
        while True:
            try:
                await websocket.send_json(_serialize(symbol))
            except WebSocketDisconnect:
                raise  # let the outer handler log this as a normal disconnect, not an error
            except Exception:
                logger.exception("Failed to send live snapshot for %s", symbol)
                break
            await asyncio.sleep(settings.ws_poll_interval_seconds)
    except WebSocketDisconnect:
        logger.info("Client disconnected from live feed for %s", symbol)
    finally:
        await hub.unsubscribe(symbol)

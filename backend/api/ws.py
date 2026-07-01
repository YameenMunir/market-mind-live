from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import get_settings
from services import price_service
from services.market_status_service import get_market_status
from utils.errors import AppError

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.websocket("/ws/live/{symbol}")
async def live_feed(websocket: WebSocket, symbol: str):
    await websocket.accept()
    try:
        while True:
            try:
                quote = price_service.get_quote(symbol)
                status = get_market_status(symbol)
                await websocket.send_json(
                    {
                        "type": "update",
                        "quote": quote.model_dump(mode="json"),
                        "market_status": status.model_dump(mode="json"),
                    }
                )
            except AppError as exc:
                await websocket.send_json(
                    {
                        "type": "error",
                        "error_code": exc.error_code.value,
                        "message": exc.message,
                    }
                )
            except Exception as exc:  # keep the stream alive on unexpected errors
                logger.exception("Unexpected error in live feed for %s", symbol)
                await websocket.send_json(
                    {
                        "type": "error",
                        "error_code": "internal_error",
                        "message": "Temporary issue fetching live data, retrying...",
                    }
                )

            await asyncio.sleep(settings.ws_poll_interval_seconds)
    except WebSocketDisconnect:
        logger.info("Client disconnected from live feed for %s", symbol)

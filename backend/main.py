from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import assets, backtest, indicators, market, predictions, prices, risk, ws
from config import get_settings
from services.live_hub import hub
from utils.errors import register_error_handlers
from utils.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    # Cancel every live-hub background poller on shutdown so reloads/restarts don't
    # leak asyncio tasks holding open Yahoo connections.
    await hub.shutdown()


app = FastAPI(
    title="Market Mind Live API",
    description="Live market intelligence API: quotes, indicators, predictions, risk, and backtesting.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(assets.router)
app.include_router(prices.router)
app.include_router(market.router)
app.include_router(indicators.router)
app.include_router(predictions.router)
app.include_router(risk.router)
app.include_router(backtest.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.app_env}

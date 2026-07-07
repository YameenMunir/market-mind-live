from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    ai_insights,
    alerts,
    analysts,
    assets,
    backtest,
    debug,
    fx,
    indicators,
    knowledge,
    market,
    predictions,
    prices,
    risk,
    ws,
)
# Aliased - `settings` at module scope below is the app's Settings instance, not this router module.
from api import settings as settings_router
from config import get_settings
from db.migrate import run_migrations
from db.session import engine
from services.live_hub import hub
from utils.errors import register_error_handlers
from utils.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


def _log_startup_config() -> None:
    """Surfaces the active data-provider/live-update configuration at boot, so a
    misconfigured deployment (e.g. an unset Gemini key, or an interval edited to
    something unsafe) is visible in the logs immediately rather than discovered later.
    """
    logger.info("Database: %s (migrations applied at startup).", settings.database_url)
    logger.info(
        "Market data provider: yfinance (unofficial Yahoo Finance API, no API key required)."
    )
    logger.info(
        "Live poll cadence - open: %ss, extended hours: %ss, closed: %ss (adapts per symbol "
        "based on its own market session; see services/live_hub.py).",
        settings.hub_quote_interval_open_seconds,
        settings.hub_quote_interval_extended_seconds,
        settings.hub_quote_interval_closed_seconds,
    )
    if settings.gemini_api_key:
        logger.info("AI Insights Assistant: using live Gemini API (model=%s).", settings.gemini_model)
    else:
        logger.warning(
            "AI Insights Assistant: GEMINI_API_KEY is not set - falling back to the deterministic "
            "mock provider. Set GEMINI_API_KEY in backend/.env for live Gemini responses."
        )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_migrations()
    _log_startup_config()
    yield
    # Cancel every live-hub background poller on shutdown so reloads/restarts don't
    # leak asyncio tasks holding open Yahoo connections.
    await hub.shutdown()
    engine.dispose()


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
app.include_router(ai_insights.router)
app.include_router(alerts.router)
app.include_router(fx.router)
app.include_router(analysts.router)
app.include_router(knowledge.router)
app.include_router(settings_router.router)
app.include_router(debug.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.app_env}

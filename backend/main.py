from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from api import (
    ai_insights,
    alerts,
    analysts,
    assets,
    backtest,
    debug,
    fx,
    gemini_key,
    indicators,
    knowledge,
    market,
    news,
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
from services import gemini_service
from services.gemini_service import looks_like_valid_key_format
from services.live_hub import hub
from utils.api_middleware import BodySizeLimitMiddleware, IPRateLimitMiddleware
from utils.errors import register_error_handlers
from utils.logging import RequestIdMiddleware, configure_logging

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
        if looks_like_valid_key_format(settings.gemini_api_key):
            logger.info("AI Insights Assistant: using live Gemini API (model=%s).", settings.gemini_model)
        else:
            logger.warning(
                "AI Insights Assistant: GEMINI_API_KEY is set but doesn't match the expected "
                'format (Google AI Studio keys start with "AIza" and are 39 characters long) - '
                "every chat request will fail authentication and silently fall back to the mock "
                "provider. Get a real key at https://aistudio.google.com/apikey."
            )
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
    await gemini_service.aclose()
    engine.dispose()


app = FastAPI(
    title="Market Mind Live API",
    description="Live market intelligence API: quotes, indicators, predictions, risk, and backtesting.",
    version="1.0.0",
    lifespan=lifespan,
)

# Order matters here: Starlette applies the *last*-added middleware outermost, so
# CORSMiddleware (added last, below) wraps every other layer - meaning a request
# rejected early by IPRateLimitMiddleware/BodySizeLimitMiddleware (a 429/413 built and
# sent without ever reaching the router) still gets proper CORS headers, instead of
# the browser reporting a confusing CORS error instead of the real 429/413. Same
# reasoning for RequestIdMiddleware - every response, including early rejections, gets
# tagged with a correlation id.
app.add_middleware(GZipMiddleware, minimum_size=settings.gzip_min_size_bytes)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(IPRateLimitMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
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
app.include_router(gemini_key.router)
app.include_router(alerts.router)
app.include_router(fx.router)
app.include_router(analysts.router)
app.include_router(news.router)
app.include_router(knowledge.router)
app.include_router(settings_router.router)
app.include_router(debug.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.app_env}


@app.get("/api/health/live", tags=["health"])
def liveness_check():
    """Liveness: is the process itself up and able to handle a request at all - never
    checks external dependencies, so a slow/rate-limited yfinance or Gemini can't make
    an orchestrator (k8s, a PaaS health check) think the process itself is dead and
    kill/restart a perfectly healthy instance."""
    return {"status": "ok"}


@app.get("/api/health/ready", tags=["health"])
def readiness_check():
    """Readiness: can this instance actually serve traffic right now - checks the one
    hard dependency every request-handling path needs (the database), so an
    orchestrator can hold traffic back from an instance that's up but can't yet (or
    can no longer) reach its DB, instead of routing requests to it and returning 500s.
    Deliberately does not check yfinance/Gemini - both already degrade gracefully
    per-request (stale-cache fallback, mock AI provider) rather than requiring the
    whole instance to be marked unready when either has a transient issue.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("Readiness check failed: database unreachable.", exc_info=exc)
        return JSONResponse(status_code=503, content={"status": "unavailable", "reason": "database_unreachable"})
    return {"status": "ok"}

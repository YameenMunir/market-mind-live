"""Coarse, dependency-free ASGI middlewares protecting the API under high or abusive
traffic: a per-client-IP request-rate ceiling and a request body size cap. Both are
plain ASGI (not `BaseHTTPMiddleware`) so they can reject a request before FastAPI/
Pydantic ever parses it, and so they never buffer a streaming response body just to
inspect it.
"""

from __future__ import annotations

import json
import time

from config import get_settings
from models.schemas import ErrorCode
from utils.cache import RateLimiter

_EXEMPT_PATH_PREFIXES = ("/api/health", "/docs", "/redoc", "/openapi.json")


def _client_ip(scope) -> str:
    client = scope.get("client")
    return client[0] if client else "unknown"


def _json_response(status: int, error_code: ErrorCode, message: str, *, retry_after: int | None = None):
    headers = [(b"content-type", b"application/json")]
    if retry_after is not None:
        headers.append((b"retry-after", str(retry_after).encode()))
    body = json.dumps({"error_code": error_code.value, "message": message, "detail": None}).encode()

    async def _send(send):
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})

    return _send


class IPRateLimitMiddleware:
    """Per-client-IP sliding-window request ceiling across every endpoint - a coarse
    safety net distinct from the AI-chat- and provider-specific limiters elsewhere in
    the app (services/ai_insights_service.py, services/price_service.py), which guard
    specific expensive operations rather than raw request volume. Disabled entirely
    when `api_rate_limit_per_minute` is 0 or less.
    """

    def __init__(self, app) -> None:
        self.app = app
        settings = get_settings()
        self._limit = settings.api_rate_limit_per_minute
        self._limiter = RateLimiter(max_per_minute=self._limit) if self._limit > 0 else None

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or self._limiter is None:
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path.startswith(_EXEMPT_PATH_PREFIXES):
            await self.app(scope, receive, send)
            return

        if not self._limiter.check(_client_ip(scope)):
            responder = _json_response(
                429,
                ErrorCode.RATE_LIMITED,
                "Too many requests from this client - please slow down.",
                retry_after=60,
            )
            await responder(send)
            return

        await self.app(scope, receive, send)


class BodySizeLimitMiddleware:
    """Rejects a request body larger than `max_request_body_bytes` with 413, before
    it reaches FastAPI's request parsing - protects against a client (accidental or
    malicious) sending an oversized payload that would otherwise be fully buffered in
    memory just to be validated and rejected by Pydantic afterwards.
    """

    def __init__(self, app) -> None:
        self.app = app
        self._max_bytes = get_settings().max_request_body_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or self._max_bytes <= 0:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        content_length = headers.get(b"content-length")
        if content_length is not None:
            try:
                if int(content_length) > self._max_bytes:
                    await _json_response(
                        413,
                        ErrorCode.VALIDATION_ERROR,
                        "Request body is too large.",
                    )(send)
                    return
            except ValueError:
                pass

        # No (or an untrustworthy) Content-Length - still cap actual bytes received as
        # they stream in, so a chunked request can't bypass the header check above.
        received = 0
        limit = self._max_bytes

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise _BodyTooLarge()
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            # Best-effort: if the downstream app already started writing a response
            # before the oversized chunk arrived, sending another response.start here
            # would itself error - that's fine, the connection is being torn down
            # either way and the client already isn't getting a clean response.
            try:
                await _json_response(413, ErrorCode.VALIDATION_ERROR, "Request body is too large.")(send)
            except Exception:
                pass


class _BodyTooLarge(Exception):
    pass

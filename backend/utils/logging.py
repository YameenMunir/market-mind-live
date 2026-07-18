from __future__ import annotations

import contextvars
import logging
import sys
import time
import uuid

_request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class _RequestIdFilter(logging.Filter):
    """Injects the current request's correlation id into every log record emitted
    while handling it, so a support/ops engineer can grep one request id across every
    log line it produced - including ones several layers deep in services/providers
    that have no direct access to the FastAPI `Request` object.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_ctx.get()
        return True


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] [req=%(request_id)s] %(message)s")
    )
    handler.addFilter(_RequestIdFilter())
    root.addHandler(handler)
    root.setLevel(level.upper())


class RequestIdMiddleware:
    """ASGI middleware: assigns each request a correlation id (reusing an incoming
    `X-Request-Id` header if the caller/proxy already set one, so a request can be
    traced end-to-end across services), stashes it on `request.state.request_id` and a
    contextvar (for log correlation - see `_RequestIdFilter` above), echoes it back on
    the response, and logs one structured line per request (method, path, status,
    duration) - the minimum viable request-level observability without pulling in a
    metrics/tracing stack for a single-process app this size.
    """

    def __init__(self, app) -> None:
        self.app = app
        self.logger = logging.getLogger("request")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming = headers.get(b"x-request-id")
        request_id = incoming.decode("latin-1") if incoming else str(uuid.uuid4())
        token = _request_id_ctx.set(request_id)
        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id

        status_code = 500
        start = time.monotonic()

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                message_headers = list(message.get("headers", []))
                message_headers.append((b"x-request-id", request_id.encode("latin-1")))
                message["headers"] = message_headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.monotonic() - start) * 1000
            method = scope.get("method", "-")
            path = scope.get("path", "-")
            log_level = logging.WARNING if status_code >= 500 else logging.INFO
            self.logger.log(
                log_level,
                "%s %s -> %s in %.1fms",
                method, path, status_code, duration_ms,
            )
            _request_id_ctx.reset(token)

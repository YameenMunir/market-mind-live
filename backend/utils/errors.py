from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from models.schemas import ErrorCode, ErrorResponse


class AppError(Exception):
    status_code = 500
    error_code = ErrorCode.INTERNAL_ERROR

    def __init__(self, message: str, detail: str | None = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class MissingApiKeyError(AppError):
    status_code = 424
    error_code = ErrorCode.MISSING_API_KEY


class InvalidSymbolError(AppError):
    status_code = 404
    error_code = ErrorCode.INVALID_SYMBOL


class RateLimitedError(AppError):
    status_code = 429
    error_code = ErrorCode.RATE_LIMITED


class MarketClosedError(AppError):
    status_code = 200
    error_code = ErrorCode.MARKET_CLOSED


class NetworkError(AppError):
    status_code = 503
    error_code = ErrorCode.NETWORK_ERROR


class DataDelayedError(AppError):
    status_code = 200
    error_code = ErrorCode.DATA_DELAYED


class UnsupportedAssetTypeError(AppError):
    status_code = 400
    error_code = ErrorCode.UNSUPPORTED_ASSET_TYPE


class ValidationError(AppError):
    status_code = 400
    error_code = ErrorCode.VALIDATION_ERROR


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    payload = ErrorResponse(error_code=exc.error_code, message=exc.message, detail=exc.detail)
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump(mode="json"))


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    payload = ErrorResponse(
        error_code=ErrorCode.INTERNAL_ERROR,
        message="An unexpected error occurred while processing your request.",
        detail=str(exc),
    )
    return JSONResponse(status_code=500, content=payload.model_dump(mode="json"))


def register_error_handlers(app) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

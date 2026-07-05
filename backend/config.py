from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"

    cors_origins: str = "http://localhost:3000"

    # SQLite by default - zero-config for local dev, no separate DB server to run.
    # Swap for a Postgres URL (e.g. postgresql+psycopg://...) in production if the
    # deployment target has an ephemeral filesystem, since a SQLite file won't survive
    # a redeploy there.
    database_url: str = "sqlite:///./market_mind.db"

    quote_cache_ttl_seconds: int = 10
    candle_cache_ttl_seconds: int = 30
    search_cache_ttl_seconds: int = 300
    fx_cache_ttl_seconds: int = 300
    # Analyst ratings/price targets move at most a few times a month, not intraday -
    # a long TTL keeps this off the hot path without going stale in any practical sense.
    analyst_cache_ttl_seconds: int = 1800

    # Cadence at which each connected client receives a push over the WebSocket. This is
    # independent of how often the server actually calls out to Yahoo (see hub settings
    # below) - many clients watching the same symbol share one upstream poller, so this
    # can safely be 1s without multiplying outbound requests per viewer.
    ws_poll_interval_seconds: int = 1

    # Per-symbol quota, plus a much larger cross-symbol quota - Yahoo's undocumented
    # throttling is IP-wide, not per-symbol, so a dashboard watching many symbols could
    # stay under every individual symbol's limit while still tripping Yahoo's real one.
    # This is a circuit breaker for genuine runaway/bug scenarios, not a tuned-to-Yahoo
    # figure (Yahoo publishes no real number) - raise it if legitimately watching many
    # symbols at once trips it during normal use.
    provider_rate_limit_per_minute: int = 60
    provider_global_rate_limit_per_minute: int = 900

    # yfinance has no official retry/backoff of its own - transient network hiccups
    # (DNS blips, connection resets) are retried here with exponential backoff + jitter
    # before surfacing a NetworkError to callers.
    provider_max_retries: int = 3
    provider_retry_base_delay_seconds: float = 0.5

    # When Yahoo itself returns a rate-limit response, every symbol's poller backs off
    # together for this long (see data/yfinance_provider.py's cooldown) instead of each
    # independently retrying into a still-active limit.
    provider_rate_limit_cooldown_seconds: float = 15.0

    # AI Insights Assistant (Gemini). If gemini_api_key is unset, the assistant falls back
    # to a deterministic mock provider so the feature still works in local development.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: float = 20.0
    ai_chat_rate_limit_per_minute: int = 20
    ai_max_history_messages: int = 20
    # Short-lived cache for identical (context + question) Gemini calls, so an accidental
    # double-submit or an immediate retry doesn't burn a second Gemini request for an
    # answer that would be identical anyway. Kept short since market context moves.
    ai_response_cache_ttl_seconds: float = 30.0

    # LiveDataHub: one background poller per actively-watched symbol, shared across every
    # client subscribed to it, so N viewers of the same symbol still cost 1 upstream poll.
    # yfinance (unofficial Yahoo scraping, no API key, no vendor SLA) has no push/streaming
    # API and no documented rate limit - hitting it every second for every watched symbol
    # around the clock risks a soft IP ban. Instead the poller adapts its own cadence to
    # the market session for that symbol: fast (as close to 1s as is safe) while a market
    # is actually open, slower during pre/after-hours (prices move less), and much slower
    # while fully closed (weekends, overnight) since the price cannot change at all - this
    # is the "fastest safe interval, explained" fallback called for when true 1s push
    # streaming isn't available from the provider.
    hub_quote_interval_open_seconds: float = 1.0
    hub_quote_interval_extended_seconds: float = 5.0
    hub_quote_interval_closed_seconds: float = 60.0
    hub_indicator_interval_seconds: float = 30.0
    hub_idle_shutdown_seconds: float = 45.0
    hub_error_backoff_max_seconds: float = 30.0

    # Price Predictor forecast (services/prediction_service.py). A daily-bar-derived
    # forecast doesn't meaningfully change minute-to-minute, so this is cached far longer
    # than candle_cache_ttl_seconds - recomputing it on every poll would be wasted work.
    forecast_cache_ttl_seconds: float = 300.0
    forecast_max_horizon_days: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

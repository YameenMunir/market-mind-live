from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"

    cors_origins: str = "http://localhost:3000"

    quote_cache_ttl_seconds: int = 10
    candle_cache_ttl_seconds: int = 30
    search_cache_ttl_seconds: int = 300

    # Cadence at which each connected client receives a push over the WebSocket. This is
    # independent of how often the server actually calls out to Yahoo (see hub settings
    # below) - many clients watching the same symbol share one upstream poller, so this
    # can safely be 1s without multiplying outbound requests per viewer.
    ws_poll_interval_seconds: int = 1

    provider_rate_limit_per_minute: int = 60

    # AI Insights Assistant (Gemini). If gemini_api_key is unset, the assistant falls back
    # to a deterministic mock provider so the feature still works in local development.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: float = 20.0
    ai_chat_rate_limit_per_minute: int = 20
    ai_max_history_messages: int = 20

    # LiveDataHub: one background poller per actively-watched symbol, shared across every
    # client subscribed to it, so N viewers of the same symbol still cost 1 upstream poll.
    hub_quote_interval_seconds: float = 2.0
    hub_indicator_interval_seconds: float = 30.0
    hub_idle_shutdown_seconds: float = 45.0
    hub_error_backoff_max_seconds: float = 30.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

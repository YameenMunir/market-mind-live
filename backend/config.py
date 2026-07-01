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

    ws_poll_interval_seconds: int = 5
    provider_rate_limit_per_minute: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

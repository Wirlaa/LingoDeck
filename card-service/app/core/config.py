"""
Card Service configuration.

This service reads from language_content (owned by quest-service, same DB)
and generates card packs. It does NOT write to language_content.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "card-service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Same shared database as quest-service and challenge-service
    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@db:5432/lingo_db"
    DATABASE_ECHO: bool = False

    SERVICE_SECRET: str = "changeme"

    # Number of cards per pack
    PACK_SIZE: int = 5

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

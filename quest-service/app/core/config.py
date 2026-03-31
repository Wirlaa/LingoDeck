from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "quest-service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@quest-db:5432/quest_db"
    DATABASE_ECHO: bool = False

    SERVICE_SECRET: str = "changeme"

    QUEST_PACK_SIZE: int = 5
    FUZZY_MATCH_THRESHOLD: float = 0.75

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

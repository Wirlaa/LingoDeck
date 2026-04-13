from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "card-service"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@db:5432/lingo_db"
    DATABASE_ECHO: bool = False

    SERVICE_SECRET: str = "changeme"

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Pack settings
    PACK_SIZE: int = 3
    SCENARIO_BIAS_CHANCE: float = 0.70   # 70% chance a biased pack card is from the target scenario

    # Battle gate
    BATTLE_MIN_CARDS: int = 6
    BATTLE_MIN_STAR: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    APP_NAME: str = "lingo-python-service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@python-db:5432/lingo_python"
    DATABASE_ECHO: bool = False

    # Security
    SERVICE_SECRET: str = "changeme"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Challenge settings
    CHALLENGE_PACK_SIZE: int = 5
    FUZZY_MATCH_THRESHOLD: float = 0.75

    # Battle settings
    PLAYER_MAX_HP: int = 100
    AI_MAX_HP: int = 100
    AI_FLAT_DAMAGE: int = 15
    MAX_BATTLE_TURNS: int = 12
    KELA_MIN_DECK_SIZE: int = 6

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

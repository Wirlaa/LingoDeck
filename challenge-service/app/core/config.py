from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "challenge-service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@challenge-db:5432/challenge_db"
    DATABASE_ECHO: bool = False

    SERVICE_SECRET: str = "changeme"

    # Anthropic - for KELA LLM boss
    ANTHROPIC_API_KEY: str = ""

    # Quest Service connection
    # Challenge Service calls this to fetch quest questions for boss fights
    QUEST_SERVICE_URL: str = "http://quest-service:8001"
    QUEST_SERVICE_SECRET: str = "changeme"

    # Boss fight settings
    PLAYER_MAX_HP: int = 100
    AI_MAX_HP: int = 100
    AI_FLAT_DAMAGE: int = 15
    MAX_CHALLENGE_TURNS: int = 12
    KELA_MIN_DECK_SIZE: int = 6

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

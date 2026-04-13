from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "quest-service"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@db:5432/lingo_db"
    DATABASE_ECHO: bool = False

    SERVICE_SECRET: str = "changeme"

    LLM_BACKEND: str = "auto"
    ANTHROPIC_API_KEY: str = ""
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "phi3.5:3.8b"
    OLLAMA_TIMEOUT: float = 60.0

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

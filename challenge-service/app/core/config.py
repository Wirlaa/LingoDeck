"""
Challenge Service configuration.

Manages the big battle system (meter-based, 4 scenarios).
Calls quest-service for questions and card-service to verify deck eligibility.

LLM_BACKEND options:
  "auto"      → Anthropic if API key set, else Ollama
  "anthropic" → Claude Haiku (cloud deploy)
  "ollama"    → local Ollama
  "none"      → disable LLM, use fallback questions only
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "challenge-service"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@db:5432/lingo_db"
    DATABASE_ECHO: bool = False

    SERVICE_SECRET: str = "changeme"

    # URLs for inter-service calls
    QUEST_SERVICE_URL:  str = "http://my-stack_quest:8001"
    CARD_SERVICE_URL:   str = "http://my-stack_card:8002"
    QUEST_SERVICE_SECRET: str = "changeme"

    # LLM config (for KELA boss question generation)
    LLM_BACKEND:       str   = "auto"
    ANTHROPIC_API_KEY: str   = ""
    OLLAMA_HOST:       str   = "http://localhost:11434"
    OLLAMA_MODEL:      str   = "phi3.5:3.8b"
    OLLAMA_TIMEOUT:    float = 120.0

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

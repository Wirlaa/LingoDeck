"""
Challenge Service configuration.

This service manages KELA boss fights only.
It calls quest-service to fetch questions at fight start,
then runs the full HP/turn battle loop locally.

LLM_BACKEND controls how KELA questions are generated:
  "auto"       → Anthropic if API key present, else Ollama
  "anthropic"  → Claude Haiku (recommended for cloud deploy)
  "ollama"     → Ollama running locally or on same VPS

Deployment with Ollama on a VPS (zero API cost):
  1. Install: curl -fsSL https://ollama.com/install.sh | sh
  2. Pull:    ollama pull phi3.5:3.8b
  3. Enable:  systemctl enable ollama
  4. Set:     OLLAMA_HOST=http://localhost:11434 in .env
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "challenge-service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Same shared database
    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@db:5432/lingo_db"
    DATABASE_ECHO: bool = False

    # Used to verify requests from Node.js and to call quest-service
    SERVICE_SECRET: str = "changeme"

    # Quest Service URL — challenge-service calls this to fetch questions
    QUEST_SERVICE_URL: str = "http://quest-service:8001"
    QUEST_SERVICE_SECRET: str = "changeme"   # must match quest-service SERVICE_SECRET

    # LLM backend for KELA question generation
    LLM_BACKEND: str = "auto"
    ANTHROPIC_API_KEY: str = ""
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "phi3.5:3.8b"
    OLLAMA_TIMEOUT: float = 120.0

    # Boss fight settings
    PLAYER_MAX_HP: int = 100
    AI_MAX_HP: int = 100
    AI_FLAT_DAMAGE: int = 15   # damage taken on wrong answer
    KELA_MIN_DECK_SIZE: int = 6

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

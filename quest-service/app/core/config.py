"""
Quest Service configuration.

All settings come from environment variables (or .env file).
Sensitive values like DB credentials and API keys must NEVER be hardcoded.

LLM_BACKEND controls which LLM provider is used for the fallback generator:
  "auto"       → use Anthropic if ANTHROPIC_API_KEY is set, else Ollama
  "anthropic"  → force Claude Haiku (cloud, needs API key)
  "ollama"     → force Ollama (local, needs Ollama running)
  "none"       → disable LLM fallback entirely (wordbank only)
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "quest-service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Shared PostgreSQL database — same instance for all three services
    DATABASE_URL: str = "postgresql+asyncpg://lingo:lingo@db:5432/lingo_db"
    DATABASE_ECHO: bool = False  # set True to log all SQL queries

    # Shared service-to-service secret.
    # Challenge-service sends this header when calling /quests/generate-internal.
    # Must match SERVICE_SECRET in challenge-service .env.
    SERVICE_SECRET: str = "changeme"

    # --- LLM settings ---

    # Which LLM backend to use for quest generation fallback.
    # "auto" means: use Anthropic if key is present, else Ollama.
    LLM_BACKEND: str = "auto"

    # Anthropic (cloud) — set this for production deployments
    ANTHROPIC_API_KEY: str = ""

    # Ollama (local) — used in development or when deployed on a VPS with Ollama
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "phi3.5:3.8b"   # recommended for 6GB+ VRAM or 8GB+ unified RAM
    OLLAMA_TIMEOUT: float = 120.0

    # Number of cards returned in one pack
    PACK_SIZE: int = 5

    # CORS — set to your actual frontend URL in production
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

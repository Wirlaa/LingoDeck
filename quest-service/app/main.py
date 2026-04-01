"""
Quest Service entry point.

Handles:
  - Finnish wordbank (language_content table)
  - Fill-in-the-blank quest generation (wordbank + LLM fallback)
  - Answer scoring and pack score calculation
  - Internal endpoint for challenge-service to fetch questions
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine
from app.models import base, language_content, quest  # noqa: F401 — register tables
from app.models.base import Base
from app.routers import admin, quests

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Create all tables on startup, dispose engine on shutdown."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Quest Service — generates fill-in-the-blank Finnish quests. "
        "Uses wordbank by default, falls back to LLM when needed."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(quests.router)


@app.get("/", tags=["root"])
async def root() -> dict:
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/admin/health",
    }

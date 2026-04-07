"""
Challenge Service entry point.

Handles KELA boss fights only.
Generates questions via LLM at fight start, then runs locally.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine
from app.models import base, challenge_session, challenge_question  # noqa: F401
from app.models.base import Base
from app.routers import admin, challenges

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Challenge Service — KELA boss fight manager. "
        "Generates questions via LLM (Anthropic or Ollama) at fight start."
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
app.include_router(challenges.router)


@app.get("/", tags=["root"])
async def root() -> dict:
    return {"service": settings.APP_NAME, "version": settings.APP_VERSION}

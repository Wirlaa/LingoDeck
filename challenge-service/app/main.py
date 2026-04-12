"""
Challenge Service v2 — battle meter, hand system, support card effects.

Changes from v1:
  - HP bars replaced with battle meter (-100 to +100)
  - Hand/draw/discard pile card management
  - Support card effects (shield, boost, focus, retry, combo)
  - Scenario bonuses for deck building
  - Deterministic fallback for LLM failures
  - Strict question validation (target in deck, no dupes)
  - Fully separated: llm_client → question_engine → battle_engine → session_store
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
    title=f"{settings.APP_NAME} v2",
    version="0.2.0",
    description=(
        "Challenge Service v2 — battle meter, hand system, support card effects, "
        "scenario bonuses, and deterministic fallback generation."
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
    return {
        "service": settings.APP_NAME,
        "version": "0.2.0",
        "changes": [
            "Battle meter replaces HP bars",
            "Hand/draw/discard card management",
            "Support card effects: shield, boost, focus, retry, combo",
            "Scenario bonuses for deck building",
            "Deterministic fallback generation",
        ],
    }

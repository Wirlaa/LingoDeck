from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine

# Import all models so SQLAlchemy knows about them before creating tables
from app.models import base  # noqa: F401
from app.models import language_content  # noqa: F401
from app.models import challenge  # noqa: F401
from app.models import battle  # noqa: F401

from app.models.base import Base
from app.routers import admin, battles, cards, challenges

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Runs on startup and shutdown.

    On startup: create all database tables if they don't exist.
    On shutdown: close the database connection pool cleanly.

    In production you would use Alembic migrations instead of create_all.
    For this project create_all is fine - it only creates missing tables,
    it never drops or modifies existing ones.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Python microservice for Lingo Deck. "
        "Handles challenge generation, scoring, "
        "pack opening, and PvE battle sessions."
    ),
    lifespan=lifespan,
)

# CORS - allow the frontend and Node.js backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(admin.router)
app.include_router(challenges.router)
app.include_router(cards.router)
app.include_router(battles.router)


@app.get("/", tags=["root"])
async def root() -> dict:
    """Root endpoint - confirms the service is running."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/admin/health",
    }

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
    version="2.0.0",
    description="Big battle system — meter-based, star-scaled, 4 scenarios.",
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
async def root():
    return {
        "service": settings.APP_NAME,
        "version": "2.0.0",
        "battle_system": "meter -100 to +100",
        "star_scaling": "1★=±8/15  2★=±12/22  3★=±15/28  4★=±20/35",
        "scenarios": ["cafe_order", "asking_directions", "job_interview", "kela_boss"],
    }

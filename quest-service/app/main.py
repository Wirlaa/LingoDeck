from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import get_settings
from app.core.database import engine, AsyncSessionLocal
from app.models import base, language_content, quest, challenge_progress  # noqa: F401
from app.models.base import Base
from app.routers import admin, quests, challenges

settings = get_settings()


async def _auto_seed():
    """
    Seed wordbank and quest challenges on first startup if tables are empty.
    Safe to run on every restart — skips if data already exists.
    This means zero manual steps are needed after cloud deployment.
    """
    import uuid
    from sqlalchemy import select, func
    from app.models.language_content import LanguageContent
    from app.models.challenge_progress import QuestChallenge

    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Seed Finnish wordbank
            count = await db.scalar(
                select(func.count()).select_from(LanguageContent)
            )
            if count == 0:
                from app.data.finnish_seed import SEED_DATA
                inserted = 0
                for entry in SEED_DATA:
                    clean = {k: v for k, v in entry.items() if k != "content_type"}
                    db.add(LanguageContent(id=uuid.uuid4(), **clean))
                    inserted += 1
                print(f"[auto-seed] Seeded {inserted} Finnish words into wordbank.")
            else:
                print(f"[auto-seed] Wordbank already has {count} entries, skipping.")

            # Seed quest challenges
            ch_count = await db.scalar(
                select(func.count()).select_from(QuestChallenge)
            )
            if ch_count == 0:
                from app.data.challenge_seed import CHALLENGE_SEEDS
                for row in CHALLENGE_SEEDS:
                    slug, name, desc, ctype, target, scenario_filter, pack_bias, cooldown = row
                    db.add(QuestChallenge(
                        id=uuid.uuid4(),
                        slug=slug,
                        name=name,
                        description=desc,
                        challenge_type=ctype,
                        target_value=target,
                        scenario_filter=scenario_filter,
                        pack_scenario_bias=pack_bias,
                        cooldown_hours=cooldown,
                    ))
                print(f"[auto-seed] Seeded {len(CHALLENGE_SEEDS)} quest challenges.")
            else:
                print(f"[auto-seed] Challenges already seeded ({ch_count} found), skipping.")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, checkfirst=True))
    await _auto_seed()
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Finnish quest questions, wordbank, and challenge progression.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics — exposes /metrics endpoint ────────────────────────────
Instrumentator().instrument(app).expose(app)

app.include_router(admin.router)
app.include_router(quests.router)
app.include_router(challenges.router)


@app.get("/", tags=["root"])
async def root():
    return {"service": settings.APP_NAME, "version": "1.0.0"}

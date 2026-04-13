"""Admin routes — health, seed, challenge seed."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.database import get_db
from app.data.finnish_seed import SEED_DATA
from app.data.challenge_seed import CHALLENGE_SEEDS
from app.models.language_content import LanguageContent
from app.models.challenge_progress import QuestChallenge

router   = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def _require_secret(request: Request):
    if request.headers.get("x-service-secret", "") != settings.SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid service secret.")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "quest-service"}


@router.post("/seed")
async def seed(request: Request, db: AsyncSession = Depends(get_db)):
    """Seed the Finnish wordbank from finnish_seed.py."""
    _require_secret(request)
    inserted = 0
    for entry in SEED_DATA:
        existing = await db.execute(
            select(LanguageContent).where(LanguageContent.target_fi == entry["target_fi"])
        )
        if existing.scalar_one_or_none() is None:
            clean = {k: v for k, v in entry.items() if k != "content_type"}
            db.add(LanguageContent(id=uuid.uuid4(), **clean))
            inserted += 1
    await db.flush()
    return {"inserted": inserted, "total_seed": len(SEED_DATA)}


@router.post("/seed-challenges")
async def seed_challenges(request: Request, db: AsyncSession = Depends(get_db)):
    """Seed predefined quest challenge definitions."""
    _require_secret(request)
    inserted = 0
    for row in CHALLENGE_SEEDS:
        slug, name, desc, ctype, target, scenario_filter, pack_bias, cooldown = row
        existing = await db.execute(
            select(QuestChallenge).where(QuestChallenge.slug == slug)
        )
        if existing.scalar_one_or_none() is None:
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
            inserted += 1
    await db.flush()
    return {"inserted": inserted, "total": len(CHALLENGE_SEEDS)}


@router.get("/content")
async def content(request: Request, db: AsyncSession = Depends(get_db)):
    """List all language content (secret required)."""
    _require_secret(request)
    result = await db.execute(select(LanguageContent).where(LanguageContent.is_active == True))
    rows = result.scalars().all()
    return {
        "count": len(rows),
        "items": [
            {"target_fi": r.target_fi, "rarity": r.rarity,
             "scenario_tags": r.scenario_tags, "difficulty": r.difficulty}
            for r in rows
        ],
    }

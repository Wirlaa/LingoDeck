"""
Admin router — health check and database seeding.

POST /admin/seed   → loads all Finnish sentences into language_content table
GET  /admin/health → liveness probe used by Docker and load balancers
GET  /admin/content → lists seeded rows (debug only, protected)

The seed endpoint is protected by x-service-secret so random users
cannot reset the database. Run it once after first deploy.
"""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.data.finnish_seed import SEED_DATA
from app.models.language_content import LanguageContent

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def _require_secret(x_service_secret: str = Header(...)) -> None:
    """Reject requests with the wrong service secret."""
    if x_service_secret != settings.SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    """Liveness probe. Returns 200 if the service and DB are both up."""
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "db": db_ok,
    }


@router.post("/seed", dependencies=[Depends(_require_secret)])
async def seed(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Load Finnish content into the database.
    Safe to run multiple times — skips rows that already exist.
    """
    inserted = 0
    skipped = 0

    for entry in SEED_DATA:
        existing = await db.execute(
            select(LanguageContent).where(
                LanguageContent.sentence_fi == entry["sentence_fi"],
                LanguageContent.target_fi == entry["target_fi"],
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        db.add(LanguageContent(
            id=uuid.uuid4(),
            sentence_fi=entry["sentence_fi"],
            sentence_en=entry["sentence_en"],
            target_fi=entry["target_fi"],
            target_en=entry["target_en"],
            difficulty=entry["difficulty"],
            rarity=entry["rarity"],
            scenario_tags=entry["scenario_tags"],
            is_active=True,
        ))
        inserted += 1

    return {
        "message": f"Seed complete: {inserted} inserted, {skipped} skipped.",
        "inserted": inserted,
        "skipped": skipped,
        "total": len(SEED_DATA),
    }


@router.get("/content", dependencies=[Depends(_require_secret)])
async def list_content(db: AsyncSession = Depends(get_db)) -> list[dict]:
    """List all active content rows. Debug only."""
    result = await db.execute(
        select(LanguageContent).where(LanguageContent.is_active.is_(True))
    )
    return [
        {
            "id": str(r.id),
            "sentence_fi": r.sentence_fi,
            "target_fi": r.target_fi,
            "rarity": r.rarity,
            "difficulty": r.difficulty,
            "scenario_tags": r.scenario_tags,
        }
        for r in result.scalars().all()
    ]

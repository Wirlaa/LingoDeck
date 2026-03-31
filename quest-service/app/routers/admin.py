"""
Admin router for the Challenge Service.

GET  /admin/health   - liveness probe
POST /admin/seed     - load Finnish content into LanguageContent table
GET  /admin/content  - list all seeded content rows (debug)
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


def _check_secret(x_service_secret: str = Header(...)) -> None:
    if x_service_secret != settings.SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
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


@router.post("/seed", dependencies=[Depends(_check_secret)])
async def seed(db: AsyncSession = Depends(get_db)) -> dict:
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

        row = LanguageContent(
            id=uuid.uuid4(),
            sentence_fi=entry["sentence_fi"],
            sentence_en=entry["sentence_en"],
            target_fi=entry["target_fi"],
            target_en=entry["target_en"],
            difficulty=entry["difficulty"],
            rarity=entry["rarity"],
            scenario_tags=entry["scenario_tags"],
            is_active=True,
        )
        db.add(row)
        inserted += 1

    return {
        "message": f"Seed complete: {inserted} inserted, {skipped} skipped.",
        "inserted": inserted,
        "skipped": skipped,
        "total": len(SEED_DATA),
    }


@router.get("/content", dependencies=[Depends(_check_secret)])
async def list_content(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(
        select(LanguageContent).where(LanguageContent.is_active.is_(True))
    )
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "sentence_fi": r.sentence_fi,
            "target_fi": r.target_fi,
            "rarity": r.rarity,
            "difficulty": r.difficulty,
            "scenario_tags": r.scenario_tags,
        }
        for r in rows
    ]

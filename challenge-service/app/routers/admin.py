"""
Admin router for the Challenge Service.

GET /admin/health  - liveness probe
                    (no seed needed, Challenge Service has no content DB —
                     it fetches questions from Quest Service on demand)
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


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

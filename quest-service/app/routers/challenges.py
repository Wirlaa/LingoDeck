"""Quest challenge progress routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.challenge_tracker import get_user_progress

router = APIRouter(prefix="/quests/challenges", tags=["challenges"])


@router.get("/{user_id}")
async def get_challenges(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get all challenges with the user's current progress."""
    progress = await get_user_progress(db, user_id)
    return {"user_id": user_id, "challenges": progress}

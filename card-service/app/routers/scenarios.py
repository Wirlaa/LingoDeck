"""Scenario unlock routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.card import ScenarioUnlockRequest
from app.services import card_service

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("/unlocks/{user_id}")
async def get_unlocks(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get all scenarios a user has unlocked."""
    scenarios = await card_service.get_unlocked_scenarios(db, user_id)
    return {"user_id": user_id, "unlocked": scenarios}


@router.post("/unlock")
async def unlock_scenario(body: ScenarioUnlockRequest, db: AsyncSession = Depends(get_db)):
    """
    Unlock the next scenario after a user beats a big battle.
    Called by game-backend when challenge-service returns status='won'.
    """
    await card_service.ensure_cafe_unlocked(db, body.user_id)
    newly_unlocked = await card_service.unlock_next_scenario(db, body.user_id, body.beaten_scenario)
    return {
        "beaten_scenario": body.beaten_scenario,
        "newly_unlocked":  newly_unlocked,
        "message": f"Unlocked {newly_unlocked}!" if newly_unlocked else "Already at final scenario.",
    }

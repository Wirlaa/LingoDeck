"""Quest routes — generate and submit fill-in-the-blank questions."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.quest import QuestGenerateRequest, QuestSubmitRequest
from app.services import quest_service
from app.services.challenge_tracker import on_answer

router   = APIRouter(prefix="/quests", tags=["quests"])
settings = get_settings()


@router.post("/generate", status_code=201)
async def generate_quest(body: QuestGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate one fill-in-the-blank quest question."""
    try:
        quest = await quest_service.generate_quest(
            db,
            user_id=body.user_id,
            scenario_tag=body.scenario_tag,
            difficulty_target=body.difficulty_target,
        )
        return quest
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/generate-internal", status_code=201)
async def generate_internal(
    body: QuestGenerateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Internal endpoint — returns correct_answer for challenge-service scoring.
    Requires x-service-secret header.
    """
    secret = request.headers.get("x-service-secret", "")
    if secret != settings.SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid service secret.")

    try:
        quest = await quest_service.generate_quest(
            db,
            user_id=body.user_id,
            scenario_tag=body.scenario_tag,
            difficulty_target=body.difficulty_target,
            include_answer=True,
        )
        return quest
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/submit")
async def submit_quest(body: QuestSubmitRequest, db: AsyncSession = Depends(get_db)):
    """
    Score a quest answer.
    Returns: is_correct, xp_earned, target_word_fi, completed_challenges.
    game-backend uses completed_challenges to open packs and grant XP.
    """
    try:
        result = await quest_service.score_quest(db, body.quest_id, body.given_answer)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Update challenge progress
    completed = await on_answer(
        db,
        user_id=body.user_id,
        scenario=result["scenario"],
        is_correct=result["is_correct"],
    )

    return {
        **result,
        "completed_challenges": completed,
    }

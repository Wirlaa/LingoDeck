"""
Quests router.

POST /quests/generate           → generate a quest (no correct_answer returned)
POST /quests/generate-internal  → generate with correct_answer (service-to-service only)
POST /quests/submit             → score the player's answer

The internal endpoint is called by challenge-service when building its
question queue for a KELA boss fight. It needs correct_answer stored
locally so it can score answers without calling back here mid-fight.
"""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.quest import (
    QuestGenerateRequest,
    QuestOut,
    QuestResult,
    QuestSubmitRequest,
)
from app.services import quest_service

router = APIRouter(prefix="/quests", tags=["quests"])
settings = get_settings()


def _require_secret(x_service_secret: str = Header(...)) -> None:
    if x_service_secret != settings.SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


@router.post("/generate", response_model=QuestOut, status_code=201)
async def generate(
    body: QuestGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> QuestOut:
    """
    Generate a fill-in-the-blank quest for the player.
    correct_answer is NOT included in the response.

    The quest is backed by the wordbank by default.
    If the wordbank has no match for the requested filters, the LLM
    fallback kicks in automatically (if LLM_BACKEND != "none").
    """
    try:
        quest = await quest_service.generate_quest(
            db,
            user_id=body.user_id,
            scenario_tag=body.scenario_tag,
            difficulty_target=body.difficulty_target,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return QuestOut(
        id=quest.id,
        question_fi=quest.question_fi,
        question_en=quest.question_en,
        options=quest.options,
        difficulty=quest.difficulty,
        source=quest.source,
    )


@router.post(
    "/generate-internal",
    dependencies=[Depends(_require_secret)],
    status_code=201,
)
async def generate_internal(
    body: QuestGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Internal endpoint — returns the full quest INCLUDING correct_answer.

    Protected by x-service-secret. Never call this from the frontend.
    Used by challenge-service to build its local question queue.

    Returns all QuestOut fields plus:
      "correct_answer": the word to blank out
    """
    try:
        quest = await quest_service.generate_quest(
            db,
            user_id=body.user_id,
            scenario_tag=body.scenario_tag,
            difficulty_target=body.difficulty_target,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "id": str(quest.id),
        "question_fi": quest.question_fi,
        "question_en": quest.question_en,
        "options": quest.options,
        "correct_answer": quest.correct_answer,
        "difficulty": quest.difficulty,
        "source": quest.source,
    }


@router.post("/submit", response_model=QuestResult)
async def submit(
    body: QuestSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> QuestResult:
    """
    Score the player's answer to a quest.

    If pack_awarded is True, Node.js should immediately call
    card-service POST /cards/open-pack with the returned pack_score.
    """
    try:
        quest, submission = await quest_service.score_answer(
            db,
            quest_id=body.quest_id,
            user_id=body.user_id,
            given_answer=body.given_answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    feedback = (
        "Correct!"
        if submission.is_correct
        else f'The answer was "{quest.correct_answer}".'
    )

    return QuestResult(
        quest_id=quest.id,
        correct_answer=quest.correct_answer,
        given_answer=body.given_answer,
        is_correct=submission.is_correct,
        feedback=feedback,
        xp_earned=submission.xp_earned,
        pack_score=submission.pack_score,
        pack_awarded=submission.pack_score >= quest_service.PACK_AWARD_THRESHOLD,
    )

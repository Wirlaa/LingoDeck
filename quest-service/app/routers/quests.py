"""
Quests router — SKELETON.

Three endpoints:
  POST /quests/generate           - pick a sentence, blank it, return the quest (no answer)
  POST /quests/generate-internal  - same but includes correct_answer (service-to-service only)
  POST /quests/submit             - score the player's answer, return result + pack info

Called by:
  - Node.js (for quests shown to the player — uses /generate and /submit)
  - Challenge Service (8003) via HTTP (uses /generate-internal to build
    the question queue for a boss fight, needs correct_answer for local scoring)

TODO: implement all three stubs by wiring up quest_service functions.
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.quest import (
    QuestGenerateRequest,
    QuestOut,
    QuestSubmitRequest,
    QuestResult,
)

router = APIRouter(prefix="/quests", tags=["quests"])
settings = get_settings()


def _check_secret(x_service_secret: str = Header(...)) -> None:
    """Rejects requests without the correct service-to-service secret."""
    if x_service_secret != settings.SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")


@router.post("/generate", response_model=QuestOut, status_code=201)
async def generate(
    body: QuestGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> QuestOut:
    """
    Generate a new fill-in-the-blank quest (no correct_answer in response).
    Called by Node.js for quests shown directly to the player.

    Optional filters:
      - scenario_tag: only pull sentences tagged with this scenario
      - difficulty_target: float 0.0–1.0, picks the nearest available difficulty

    TODO:
      1. Call quest_service.generate_quest(db, user_id, scenario_tag, difficulty_target)
      2. Map the returned Quest ORM object to QuestOut (no correct_answer) and return
      3. Raise HTTP 404 if quest_service raises ValueError (no content in DB)
    """
    raise HTTPException(status_code=501, detail="Not implemented yet.")


@router.post(
    "/generate-internal",
    dependencies=[Depends(_check_secret)],
    status_code=201,
)
async def generate_internal(
    body: QuestGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Internal endpoint — returns the full quest INCLUDING correct_answer.
    Protected by x-service-secret, never reachable by frontend users.

    Called by the Challenge Service (8003) when building the question queue
    for a boss fight. The Challenge Service stores correct_answer locally
    in ChallengeQuestion rows so it can score answers without calling back here.

    Returns:
      {
        "id": "uuid",
        "question_fi": "...",
        "question_en": "...",
        "options": ["a", "b", "c", "d"],
        "correct_answer": "kahvia",
        "difficulty": 0.45
      }

    TODO:
      1. Call quest_service.generate_quest(db, user_id, scenario_tag, difficulty_target)
      2. Return ALL fields including quest.correct_answer as a plain dict
      3. Raise HTTP 404 if quest_service raises ValueError
    """
    raise HTTPException(status_code=501, detail="Not implemented yet.")


@router.post("/submit", response_model=QuestResult)
async def submit(
    body: QuestSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> QuestResult:
    """
    Submit a player's answer and score it.
    Called by Node.js after the player picks an answer in a normal quest.

    Returns:
      - correct_answer  the word we were looking for (now revealed)
      - is_correct      whether the player got it right
      - feedback        "Correct!" or "The answer was kahvia."
      - xp_earned       XP to add to the user's total
      - pack_score      quality score for the pack (0.0–1.0)
      - pack_awarded    True if pack_score >= PACK_AWARD_THRESHOLD (0.50)

    If pack_awarded is True, Node.js should immediately call
    Card Service POST /cards/open-pack with the returned pack_score.

    TODO:
      1. Fetch Quest row by body.quest_id (404 if not found)
      2. Call quest_service.score_answer(quest.correct_answer, body.given_answer)
      3. Persist a QuestSubmission row
      4. Build and return QuestResult
    """
    raise HTTPException(status_code=501, detail="Not implemented yet.")

"""
Two endpoints:
  POST /challenges/generate - generate a new fill-in-the-blank challenge
  POST /challenges/submit  - score the player's answer

Flow:
  1. Node.js calls /generate with optional filters
  2. Python picks a sentence, blanks it, builds 4 options, returns the challenge
  3. Frontend shows the challenge to the player
  4. Player picks an answer, Node.js calls /submit
  5. Python scores it, records the submission, returns result + pack info
  6. If pack_awarded is True, Node.js calls /cards/open-pack separately
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.challenge import Challenge, ChallengeSubmission
from app.schemas.challenge import (
    ChallengeGenerateRequest,
    ChallengeOut,
    ChallengeSubmitRequest,
    SubmissionResult,
)
from app.services import challenge_service

router = APIRouter(prefix="/challenges", tags=["challenges"])


# POST /challenges/generate
@router.post("/generate", response_model=ChallengeOut, status_code=201)
async def generate(
    body: ChallengeGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeOut:
    """
    Generate a new fill-in-the-blank challenge.

    Optional filters:
      scenario_tag --- only pull sentences tagged for this scenario
      difficulty_target ---- pull sentences closest to this difficulty (0.0-1.0)

    Returns the challenge with 4 options but without the correct answer.
    """
    try:
        challenge = await challenge_service.generate_challenge(
            db,
            user_id=body.user_id,
            scenario_tag=body.scenario_tag,
            difficulty_target=body.difficulty_target,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return ChallengeOut(
        id=challenge.id,
        question_fi=challenge.question_fi,
        question_en=challenge.question_en,
        options=challenge.options,
        difficulty=challenge.difficulty,
    )


# POST /challenges/submit
@router.post("/submit", response_model=SubmissionResult)
async def submit(
    body: ChallengeSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> SubmissionResult:
    """
    Submit a player's answer and score it.

    Returns:
      - correct_answer - the answer we were looking for
      - is_correct     - whether the player got it right
      - feedback       - short message to show the player
      - xp_earned      - XP to add to the user's total
      - pack_score      -quality score for the pack (0.0-1.0)
      - pack_awarded    -True if the player earned a pack this submission
    """
    # Load the challenge
    result = await db.execute(
        select(Challenge).where(Challenge.id == body.challenge_id)
    )
    challenge = result.scalar_one_or_none()

    if challenge is None:
        raise HTTPException(
            status_code=404,
            detail=f"Challenge {body.challenge_id} not found.",
        )

    # Score the answer
    is_correct, feedback, xp_earned, pack_score = challenge_service.score_answer(
        challenge.correct_answer,
        body.given_answer,
    )

    pack_awarded = pack_score >= challenge_service.PACK_AWARD_THRESHOLD

    # Persist the submission
    submission = ChallengeSubmission(
        id=uuid.uuid4(),
        challenge_id=challenge.id,
        user_id=body.user_id,
        given_answer=body.given_answer,
        is_correct=is_correct,
        xp_earned=xp_earned,
        pack_score=pack_score,
    )
    db.add(submission)

    return SubmissionResult(
        challenge_id=challenge.id,
        correct_answer=challenge.correct_answer,
        given_answer=body.given_answer,
        is_correct=is_correct,
        feedback=feedback,
        xp_earned=xp_earned,
        pack_score=round(pack_score, 4),
        pack_awarded=pack_awarded,
    )

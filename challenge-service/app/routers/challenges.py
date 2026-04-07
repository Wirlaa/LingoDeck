"""
Challenges router — KELA boss fight endpoints.

POST /challenges/start              → start a new KELA boss fight
POST /challenges/{session_id}/action → submit an answer for the current turn
GET  /challenges/{session_id}        → fetch current fight state

Flow:
  1. Node.js calls /start with user_id and deck
     → LLM generates questions based on deck words (one per card)
     → questions mirrored locally, session created
     → returns session state + first question
  2. Player answers → Node.js calls /action
     → correct: player deals damage (best card power)
     → wrong: KELA deals 15 damage + taunts you
     → returns updated HP + next question + flavour text
  3. Repeat until won/lost/draw
  4. If won → Node.js calls card-service open-pack (bonus_packs times)
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.challenge import (
    ChallengeActionRequest,
    ChallengeStartRequest,
    ChallengeStateOut,
)
from app.services import challenge_service
from app.services.kela_boss import DEFEAT_TEXT, VICTORY_TEXT

router = APIRouter(prefix="/challenges", tags=["challenges"])
settings = get_settings()


@router.post("/start", response_model=ChallengeStateOut, status_code=201)
async def start_challenge(
    body: ChallengeStartRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """
    Start a new KELA boss fight.

    The LLM generates questions based on the player's deck — this is the
    slow part (~2-10s depending on model and hardware). Everything after
    this is fast local scoring with no LLM calls.

    Requires at least KELA_MIN_DECK_SIZE cards in the deck (default: 6).
    """
    try:
        session = await challenge_service.start_challenge(
            db,
            user_id=body.user_id,
            deck=[card.model_dump() for card in body.deck],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    next_q = await challenge_service.get_next_question(db, session)

    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=len(session.question_queue),
        next_question=_q_to_dict(next_q),
        last_action=None,
        ai_flavour=None,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


@router.post("/{session_id}/action", response_model=ChallengeStateOut)
async def challenge_action(
    session_id: uuid.UUID,
    body: ChallengeActionRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """
    Submit a player answer for the current turn.

    When the fight ends (status != "active"):
      bonus_packs → how many packs Node.js should open via card-service
      xp_earned   → XP to add to the user in Node.js DB
    """
    session = await challenge_service.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    try:
        session, action = await challenge_service.process_action(
            db, session, body.question_id, body.given_answer
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    next_q = await challenge_service.get_next_question(db, session)

    # Override flavour text with victory/defeat message if fight just ended
    ai_flavour = action.get("ai_flavour")
    if session.status == "won":
        ai_flavour = VICTORY_TEXT
    elif session.status == "lost":
        ai_flavour = DEFEAT_TEXT
    elif session.status == "draw":
        ai_flavour = "It's a draw. Somehow you both survived."

    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=len(session.question_queue),
        next_question=_q_to_dict(next_q),
        last_action=action,
        ai_flavour=ai_flavour,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


@router.get("/{session_id}", response_model=ChallengeStateOut)
async def get_challenge(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """Fetch current fight state. Useful for reconnecting mid-fight."""
    session = await challenge_service.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    next_q = await challenge_service.get_next_question(db, session)

    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=len(session.question_queue),
        next_question=_q_to_dict(next_q),
        last_action=None,
        ai_flavour=None,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


def _q_to_dict(q) -> dict | None:
    """Convert a ChallengeQuestion to a response dict. Hides correct_answer."""
    if q is None:
        return None
    return {
        "id": str(q.id),
        "question_fi": q.question_fi,
        "question_en": q.question_en,
        "options": q.options,   # already lowercase
        "difficulty": q.difficulty,
    }

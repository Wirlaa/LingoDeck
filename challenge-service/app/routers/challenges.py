"""
Challenges router — FULL CODE.

Four endpoints:
  GET  /challenges/scenarios             - list all available boss fight scenarios
  POST /challenges/start                 - start a new boss fight session
  POST /challenges/{session_id}/action   - submit an answer for the current turn
  GET  /challenges/{session_id}          - fetch current fight state

Flow:
  1. Node.js calls /scenarios so the frontend can show the fight select screen
  2. Player picks a scenario and a deck
  3. Node.js calls /start
     → Challenge Service calls Quest Service (8001) to fetch questions
     → For kela_boss, calls Claude LLM instead
     → Mirrors all questions into local ChallengeQuestion rows
     → Returns session state + first question
  4. Player answers → Node.js calls /action
     → Scores answer, updates HP, advances turn
     → Returns updated state + next question
  5. Repeat until status is "won", "lost", or "draw"
  6. If won, Node.js uses bonus_packs count to call Card Service (8002) open-pack
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.data.battle_scenarios import SCENARIOS
from app.schemas.challenge import (
    ChallengeActionRequest,
    ChallengeStartRequest,
    ChallengeStateOut,
)
from app.services import challenge_service

router = APIRouter(prefix="/challenges", tags=["challenges"])
settings = get_settings()


@router.get("/scenarios")
async def list_scenarios() -> dict:
    """
    Return all available boss fight scenarios.
    Strips internal fields (uses_llm, tag) before returning.
    """
    return {
        key: {
            "name": val["name"],
            "description": val["description"],
            "difficulty_min": val["difficulty_min"],
            "difficulty_max": val["difficulty_max"],
            "xp_reward": val["xp_reward"],
            "bonus_packs": val["bonus_packs"],
            "min_deck_size": val.get("min_deck_size", 1),
        }
        for key, val in SCENARIOS.items()
    }


@router.post("/start", response_model=ChallengeStateOut, status_code=201)
async def start_challenge(
    body: ChallengeStartRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """
    Start a new PvE boss fight session.

    Builds the full question queue upfront by calling the Quest Service.
    For kela_boss this involves an LLM call so may take a few seconds.
    Returns the session state including the first question.
    """
    try:
        session = await challenge_service.start_challenge(
            db,
            user_id=body.user_id,
            scenario=body.scenario,
            deck=[card.model_dump() for card in body.deck],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch questions from Quest Service: {exc}",
        ) from exc

    next_question = await challenge_service.get_next_question(db, session)
    max_turns = len(session.question_queue)

    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=max_turns,
        next_question=_question_to_dict(next_question),
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
    Submit a player answer for the current boss fight turn.

    Scores the answer, updates HP, advances the turn counter,
    checks end conditions, and returns the updated state.

    When fight ends (status != active):
      - bonus_packs tells Node.js how many packs to open via Card Service
      - xp_earned tells Node.js how much XP to add to the user
    """
    session = await challenge_service.get_session(db, session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Challenge session {session_id} not found.",
        )

    try:
        session, action_summary = await challenge_service.process_action(
            db,
            session,
            body.question_id,
            body.given_answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    next_question = await challenge_service.get_next_question(db, session)
    max_turns = len(session.question_queue)

    ai_flavour = action_summary.get("ai_flavour")
    if session.status == "won":
        ai_flavour = SCENARIOS[session.scenario]["victory_text"]
    elif session.status == "lost":
        ai_flavour = SCENARIOS[session.scenario]["defeat_text"]
    elif session.status == "draw":
        ai_flavour = "It's a draw. Somehow you both survived."

    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=max_turns,
        next_question=_question_to_dict(next_question),
        last_action=action_summary,
        ai_flavour=ai_flavour,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


@router.get("/{session_id}", response_model=ChallengeStateOut)
async def get_challenge(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """
    Fetch the current state of a boss fight session.
    Useful if the frontend needs to reconnect mid-fight.
    """
    session = await challenge_service.get_session(db, session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Challenge session {session_id} not found.",
        )

    next_question = await challenge_service.get_next_question(db, session)
    max_turns = len(session.question_queue)

    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=max_turns,
        next_question=_question_to_dict(next_question),
        last_action=None,
        ai_flavour=None,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


# ── Helper ────────────────────────────────────────────────────────────────────

def _question_to_dict(question) -> dict | None:
    """
    Convert a ChallengeQuestion ORM object to a plain dict for the response.
    Does NOT include correct_answer — stays hidden until /action is called.
    """
    if question is None:
        return None
    return {
        "id": str(question.id),
        "question_fi": question.question_fi,
        "question_en": question.question_en,
        "options": question.options,
        "difficulty": question.difficulty,
    }

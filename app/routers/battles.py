"""
Four endpoints:
  GET  /battles/scenarios          - list all available scenarios
  POST /battles/start              - start a new battle session
  POST /battles/{session_id}/action - submit an answer for the current turn
  GET  /battles/{session_id}       - fetch current battle state

Flow:
  1. Node.js calls /scenarios so the frontend can show the battle select screen
  2. Player picks a scenario and a deck
  3. Node.js calls /start - Python builds the challenge queue and returns first challenge
  4. Player answers - Node.js calls /action with the answer
  5. Python scores it, updates HP, returns updated state + next challenge
  6. Repeat until status is "won", "lost", or "draw"
  7. If won, Node.js calls /cards/open-pack for each bonus_pack earned
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.data.battle_scenarios import SCENARIOS
from app.schemas.battle import (
    BattleActionRequest,
    BattleStartRequest,
    BattleStateOut,
)
from app.services import pve_service

router = APIRouter(prefix="/battles", tags=["battles"])
settings = get_settings()


# GET /battles/scenarios
@router.get("/scenarios")
async def list_scenarios() -> dict:
    """
    Return all available battle scenarios.

    Used by the frontend to populate the battle select screen.
    Strips internal fields like uses_llm before returning.
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


# POST /battles/start
@router.post("/start", response_model=BattleStateOut, status_code=201)
async def start_battle(
    body: BattleStartRequest,
    db: AsyncSession = Depends(get_db),
) -> BattleStateOut:
    """
    Start a new PvE battle session.

    Builds the full challenge queue upfront.
    For kela_boss this involves an LLM call so may take a few seconds.
    Returns the session state including the first challenge.
    """
    try:
        session = await pve_service.start_battle(
            db,
            user_id=body.user_id,
            scenario=body.scenario,
            deck=[card.model_dump() for card in body.deck],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    next_challenge = await pve_service.get_next_challenge(db, session)
    max_turns = len(session.challenge_queue)

    return BattleStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=max_turns,
        next_challenge=_challenge_to_dict(next_challenge),
        last_action=None,
        ai_flavour=None,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


# POST /battles/{session_id}/action
@router.post("/{session_id}/action", response_model=BattleStateOut)
async def battle_action(
    session_id: uuid.UUID,
    body: BattleActionRequest,
    db: AsyncSession = Depends(get_db),
) -> BattleStateOut:
    """
    Submit a player answer for the current battle turn.

    Scores the answer, updates HP, advances the turn counter,
    checks end conditions, and returns the updated state.

    If the battle just ended (status != active):
      - bonus_packs tells Node.js how many packs to open
      - xp_earned tells Node.js how much XP to add to the user
    """
    session = await pve_service.get_session(db, session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Battle session {session_id} not found.",
        )

    try:
        session, action_summary = await pve_service.process_action(
            db,
            session,
            body.challenge_id,
            body.given_answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    next_challenge = await pve_service.get_next_challenge(db, session)
    max_turns = len(session.challenge_queue)

    # Add victory or defeat text if the battle just ended
    ai_flavour = action_summary.get("ai_flavour")
    if session.status == "won":
        ai_flavour = SCENARIOS[session.scenario]["victory_text"]
    elif session.status == "lost":
        ai_flavour = SCENARIOS[session.scenario]["defeat_text"]
    elif session.status == "draw":
        ai_flavour = "It's a draw. Somehow you both survived."

    return BattleStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=max_turns,
        next_challenge=_challenge_to_dict(next_challenge),
        last_action=action_summary,
        ai_flavour=ai_flavour,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


# GET /battles/{session_id}
@router.get("/{session_id}", response_model=BattleStateOut)
async def get_battle(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> BattleStateOut:
    """
    Fetch the current state of a battle session.

    Useful if the frontend needs to reconnect mid-battle
    or if Node.js needs to re-sync state.
    """
    session = await pve_service.get_session(db, session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=f"Battle session {session_id} not found.",
        )

    next_challenge = await pve_service.get_next_challenge(db, session)
    max_turns = len(session.challenge_queue)

    return BattleStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        player_hp=session.player_hp,
        ai_hp=session.ai_hp,
        current_turn=session.current_turn,
        max_turns=max_turns,
        next_challenge=_challenge_to_dict(next_challenge),
        last_action=None,
        ai_flavour=None,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


# helper function

def _challenge_to_dict(challenge) -> dict | None:
    """
    Convert a Challenge ORM object to a plain dict for the response.
    Does NOT include correct_answer - that stays hidden until submission.
    """
    if challenge is None:
        return None
    return {
        "id": str(challenge.id),
        "question_fi": challenge.question_fi,
        "question_en": challenge.question_en,
        "options": challenge.options,
        "difficulty": challenge.difficulty,
    }

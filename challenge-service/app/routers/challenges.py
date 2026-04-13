"""
Challenges router — big battle endpoints.

POST /challenges/start
  Deck is fetched from card-service internally. Client sends user_id + scenario only.
  Returns 400 if not enough 2★+ cards.

POST /challenges/{id}/action
  Submit answer for the current turn. Returns updated battle state.
  correct_words_this_turn in the response tells game-backend which card to give XP.

GET  /challenges/{id}
GET  /challenges/{id}/hand
POST /challenges/{id}/pre-turn  (no-op — card effects are a future feature)
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.challenge import (
    ChallengeActionRequest,
    ChallengeStartRequest,
    ChallengeStateOut,
    LastActionOut,
    PreTurnResponse,
    QuestionOut,
)
from app.services import session_store, battle_engine

router = APIRouter(prefix="/challenges", tags=["challenges"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _q_out(q) -> QuestionOut | None:
    if q is None:
        return None
    return QuestionOut(
        id=str(q.id),
        question_fi=q.question_fi,
        question_en=q.question_en,
        options=q.options,
        difficulty=q.difficulty,
        tags=q.tags or [],
        deck_card_id=q.deck_card_id,
        source=q.source,
    )


def _meter_pct(meter: int, lose: int, win: int) -> float:
    total = win - lose
    return round((meter - lose) / total, 3) if total else 0.5


def _session_out(session, next_q=None, last_action=None, correct_words=None) -> ChallengeStateOut:
    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        battle_meter=session.battle_meter,
        win_threshold=session.win_threshold,
        lose_threshold=session.lose_threshold,
        meter_percent=_meter_pct(session.battle_meter, session.lose_threshold, session.win_threshold),
        current_turn=session.current_turn,
        max_turns=session.max_turns,
        hand=session.hand or [],
        next_question=_q_out(next_q),
        last_action=last_action,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
        correct_streak=session.correct_streak,
        max_streak=session.max_streak,
        correct_words_this_turn=correct_words or [],
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/start", response_model=ChallengeStateOut, status_code=201)
async def start_challenge(
    body: ChallengeStartRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """
    Start a big battle. Fetches deck from card-service automatically.
    Returns 400 if eligibility check fails (not enough 2★+ cards).
    """
    try:
        session = await session_store.create_session(db, user_id=body.user_id, scenario=body.scenario)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    next_q = await session_store.get_next_question(db, session)
    return _session_out(session, next_q=next_q)


@router.post("/{session_id}/action", response_model=ChallengeStateOut)
async def challenge_action(
    session_id: uuid.UUID,
    body: ChallengeActionRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """Submit answer for the current turn."""
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.status != "active":
        raise HTTPException(status_code=400, detail=f"Battle is already {session.status}.")

    # Validate question_id matches current turn
    queue = session.question_queue or []
    turn_index = session.current_turn - 1
    if turn_index >= len(queue):
        raise HTTPException(status_code=400, detail="No more questions in queue.")

    if str(body.question_id) != queue[turn_index]:
        raise HTTPException(
            status_code=400,
            detail=f"Question ID mismatch for turn {session.current_turn}. Submit answers in order.",
        )

    question = await session_store.get_question(db, body.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Find answer card in deck
    all_cards = (session.hand or []) + [
        c for c in (session.deck or [])
        if c.get("card_id") not in {x.get("card_id") for x in (session.hand or [])}
    ]
    answer_card = next((c for c in all_cards if c.get("card_id") == body.answer_card_id), None)
    if answer_card is None:
        raise HTTPException(status_code=400, detail="Answer card not found in deck.")

    # Resolve turn
    session_state = {
        "scenario":      session.scenario,
        "battle_meter":  session.battle_meter,
        "win_threshold":  session.win_threshold,
        "lose_threshold": session.lose_threshold,
        "correct_base":  session.correct_base,
        "wrong_base":    session.wrong_base,
        "current_turn":  session.current_turn,
        "max_turns":     session.max_turns,
        "hand":          session.hand,
        "draw_pile":     session.draw_pile,
        "correct_streak": session.correct_streak,
        "max_streak":    session.max_streak,
    }

    turn_result = battle_engine.resolve_turn(
        session_state=session_state,
        question={
            "correct_answer": question.correct_answer,
            "options":        question.options,
            "tags":           question.tags or [],
        },
        answer_card=answer_card,
        support_card=None,
        given_answer=body.given_answer,
    )

    # Log action
    import uuid as _uuid
    db.add(_make_action(_uuid.uuid4(), session.id, session.current_turn, question.id,
                        body, turn_result))

    session = await session_store.apply_turn_result(db, session, turn_result, answer_card, None)

    last_action = LastActionOut(
        turn=session.current_turn - 1,
        question_id=str(question.id),
        given_answer=body.given_answer,
        correct_answer=question.correct_answer,
        is_correct=turn_result.is_correct,
        feedback=turn_result.feedback,
        answer_card_id=body.answer_card_id,
        meter_before=turn_result.meter_before,
        meter_delta=turn_result.meter_delta,
        meter_after=turn_result.meter_after,
        combo_triggered=turn_result.combo_triggered,
        combo_multiplier=turn_result.combo_multiplier,
        star_level=turn_result.star_level,
        ai_flavour=turn_result.ai_flavour,
    )

    # Return correct word so game-backend can grant XP to card-service
    correct_words = [answer_card.get("word_fi", "")] if turn_result.is_correct else []

    next_q = await session_store.get_next_question(db, session)
    return _session_out(session, next_q=next_q, last_action=last_action, correct_words=correct_words)


@router.get("/{session_id}", response_model=ChallengeStateOut)
async def get_challenge(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    next_q = await session_store.get_next_question(db, session)
    return _session_out(session, next_q=next_q)


@router.get("/{session_id}/hand")
async def get_hand(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "hand":              session.hand or [],
        "hand_size":         len(session.hand or []),
        "draw_pile_size":    len(session.draw_pile or []),
        "discard_pile_size": len(session.discard_pile or []),
    }


@router.post("/{session_id}/pre-turn", response_model=PreTurnResponse)
async def pre_turn(session_id: uuid.UUID, support_card_id: str,
                   db: AsyncSession = Depends(get_db)):
    """Card effects are not yet implemented. Returns no-op response."""
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    next_q = await session_store.get_next_question(db, session)
    options = next_q.options if next_q else []
    return PreTurnResponse(
        question_id=str(next_q.id) if next_q else "",
        original_options=options,
        modified_options=options,
        removed_option=None,
        effect_description="Card effects coming in a future update.",
    )


# ── Private helpers ───────────────────────────────────────────────────────────

def _make_action(action_id, session_id, turn, question_id, body, turn_result):
    from app.models.challenge_session import ChallengeAction
    return ChallengeAction(
        id=action_id,
        session_id=session_id,
        turn=turn,
        question_id=question_id,
        given_answer=body.given_answer,
        is_correct=turn_result.is_correct,
        answer_card_id=body.answer_card_id,
        support_card_id=None,
        meter_before=turn_result.meter_before,
        meter_delta=turn_result.meter_delta,
        meter_after=turn_result.meter_after,
        effect_result={},
        scenario_bonus_applied=False,
        scenario_bonus_multiplier=1.0,
    )

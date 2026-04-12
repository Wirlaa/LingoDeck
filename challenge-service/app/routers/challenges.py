"""
Challenges router 
  1. answer_card.word_fi must match correct_answer — card play is real
  2. Tags now semantic (word_tags.py) not rarity-driven (in question_engine)
  3. Pre-turn state persisted in session — FOCUS cannot be called repeatedly
  4. 400 if support_card_id sent but not in hand
  5. question_id validated against queue[current_turn - 1]
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
    EffectResultOut,
    PreTurnResponse,
    QuestionOut,
)
from app.services import session_store, battle_engine
from app.services.content_rules import SCENARIO_INFO

router = APIRouter(prefix="/challenges", tags=["challenges"])


def _q_to_out(q, removed_option: str | None = None) -> QuestionOut | None:
    if q is None:
        return None
    options = q.options
    # Apply pre-turn option removal if FOCUS was used
    if removed_option and removed_option in options:
        options = [o for o in options if o != removed_option]
    return QuestionOut(
        id=str(q.id),
        question_fi=q.question_fi,
        question_en=q.question_en,
        options=options,
        difficulty=q.difficulty,
        tags=q.tags or [],
        deck_card_id=q.deck_card_id,
        source=q.source,
    )


def _meter_percent(meter: int, lose: int, win: int) -> float:
    total = win - lose
    if total == 0:
        return 0.5
    return round((meter - lose) / total, 3)


def _session_to_out(session, next_q=None, last_action=None, ai_flavour=None) -> ChallengeStateOut:
    # Pass pre-turn removed option so frontend sees correct options
    removed = session.pre_turn_removed_opt if session.pre_turn_used else None
    return ChallengeStateOut(
        session_id=session.id,
        scenario=session.scenario,
        status=session.status,
        battle_meter=session.battle_meter,
        win_threshold=session.win_threshold,
        lose_threshold=session.lose_threshold,
        meter_percent=_meter_percent(
            session.battle_meter, session.lose_threshold, session.win_threshold
        ),
        current_turn=session.current_turn,
        max_turns=session.max_turns,
        hand=session.hand or [],
        next_question=_q_to_out(next_q, removed_option=removed),
        last_action=last_action,
        ai_flavour=ai_flavour,
        xp_earned=session.xp_earned,
        bonus_packs=session.bonus_packs,
    )


@router.post("/start", response_model=ChallengeStateOut, status_code=201)
async def start_challenge(
    body: ChallengeStartRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    try:
        session = await session_store.create_session(
            db,
            user_id=body.user_id,
            deck=[card.model_dump() for card in body.deck],
            scenario=body.scenario,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    next_q = await session_store.get_next_question(db, session)
    return _session_to_out(session, next_q=next_q)


@router.post("/{session_id}/pre-turn", response_model=PreTurnResponse)
async def pre_turn(
    session_id: uuid.UUID,
    support_card_id: str,
    db: AsyncSession = Depends(get_db),
) -> PreTurnResponse:
    """
    Play a FOCUS support card before answering.

    FIX 3: Pre-turn state is now persisted in the session.
      - Can only be called once per turn
      - Consumed support card is recorded
      - Removed option is stored so /action can validate consistency
    """
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status != "active":
        raise HTTPException(status_code=400, detail="Battle is not active.")

    # FIX 3: Prevent repeated pre-turn calls on the same turn
    if session.pre_turn_used and session.pre_turn_turn == session.current_turn:
        raise HTTPException(
            status_code=400,
            detail=f"Pre-turn already used this turn (turn {session.current_turn}). "
                   "Cannot call pre-turn twice on the same turn.",
        )

    next_q = await session_store.get_next_question(db, session)
    if next_q is None:
        raise HTTPException(status_code=400, detail="No active question.")

    # FIX 4: 400 if support card not in hand
    hand = session.hand or []
    support_card = next((c for c in hand if c.get("card_id") == support_card_id), None)
    if support_card is None:
        raise HTTPException(
            status_code=400,
            detail=f"Support card '{support_card_id}' is not in your hand.",
        )

    modified_options, effect_result = battle_engine.compute_pre_turn_effect(
        support_card=support_card,
        options=next_q.options,
        correct_answer=next_q.correct_answer,
        scenario=session.scenario,
    )

    removed_option = effect_result.removed_option if effect_result else None

    # FIX 3: Persist pre-turn state so it can't be repeated and /action can verify
    session.pre_turn_used = True
    session.pre_turn_card_id = support_card_id
    session.pre_turn_removed_opt = removed_option
    session.pre_turn_turn = session.current_turn
    await db.flush()

    return PreTurnResponse(
        question_id=str(next_q.id),
        original_options=next_q.options,
        modified_options=modified_options,
        removed_option=removed_option,
        effect_description=effect_result.description if effect_result else "No effect.",
    )


@router.post("/{session_id}/action", response_model=ChallengeStateOut)
async def challenge_action(
    session_id: uuid.UUID,
    body: ChallengeActionRequest,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    """
    Submit answer + answer card + optional support card.

    FIX 1: answer_card.word_fi must match correct_answer.
    FIX 4: 400 if support_card_id sent but card not in hand.
    FIX 5: question_id must match queue[current_turn - 1].
    """
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.status != "active":
        raise HTTPException(status_code=400, detail=f"Battle is already {session.status}.")

    # FIX 5: Validate question_id is the active question for this turn
    queue = session.question_queue or []
    turn_index = session.current_turn - 1
    if turn_index >= len(queue):
        raise HTTPException(status_code=400, detail="No more questions in queue.")

    expected_question_id = queue[turn_index]
    if str(body.question_id) != expected_question_id:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Question ID mismatch. "
                f"Expected question for turn {session.current_turn}: {expected_question_id}. "
                f"Got: {body.question_id}. "
                "Answers must be submitted in order."
            ),
        )

    # Fetch question
    question = await session_store.get_question(db, body.question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Find answer card — search hand first, then full deck
    # We show all 6 deck cards (not just the 4-card hand window), so the card
    # might not be in session.hand. Search deck as fallback.
    hand = session.hand or []
    deck = session.deck or []
    all_cards = hand + [c for c in deck if c.get("card_id") not in {x.get("card_id") for x in hand}]

    answer_card = next((c for c in all_cards if c.get("card_id") == body.answer_card_id), None)
    if answer_card is None:
        raise HTTPException(
            status_code=400,
            detail=f"Answer card not found in your deck.",
        )

    # No word validation — clicking the wrong card scores as a wrong answer
    # and the battle meter moves against the player. This is the intended design:
    # the player must figure out which card fills the blank by reading the sentence.

    # FIX 4: 400 if support_card_id provided but not in hand
    support_card = None
    if body.support_card_id:
        support_card = next(
            (c for c in hand
             if c.get("card_id") == body.support_card_id
             and c.get("card_id") != body.answer_card_id),
            None,
        )
        if support_card is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Support card '{body.support_card_id}' is not in your hand "
                    f"or is the same as your answer card."
                ),
            )

    # If pre-turn FOCUS was used this turn, use the persisted support card
    # and apply the removed option to the question's effective options
    if session.pre_turn_used and session.pre_turn_turn == session.current_turn:
        if support_card is None and session.pre_turn_card_id:
            # Pre-turn card is implicitly the support card
            support_card = next(
                (c for c in hand if c.get("card_id") == session.pre_turn_card_id),
                None,
            )

    # Build session_state dict for battle_engine
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
    }

    # Resolve turn — deterministic, no external calls
    turn_result = battle_engine.resolve_turn(
        session_state=session_state,
        question={
            "correct_answer": question.correct_answer,
            "options": question.options,
            "tags": question.tags or [],
        },
        answer_card=answer_card,
        support_card=support_card,
        given_answer=body.given_answer,
    )

    # Log action
    from app.models.challenge_session import ChallengeAction
    import uuid as _uuid
    db.add(ChallengeAction(
        id=_uuid.uuid4(),
        session_id=session.id,
        turn=session.current_turn,
        question_id=question.id,
        given_answer=body.given_answer,
        is_correct=turn_result.is_correct,
        answer_card_id=body.answer_card_id,
        support_card_id=body.support_card_id,
        meter_before=turn_result.meter_before,
        meter_delta=turn_result.meter_delta,
        meter_after=turn_result.meter_after,
        effect_result={},
        scenario_bonus_applied=getattr(turn_result, 'scenario_bonus_applied', False),
        scenario_bonus_multiplier=getattr(turn_result, 'scenario_bonus_multiplier', 1.0),
    ))

    # Apply turn result
    session = await session_store.apply_turn_result(
        db, session, turn_result, answer_card, support_card
    )

    last_action = LastActionOut(
        turn=session.current_turn - 1,
        question_id=str(question.id),
        given_answer=body.given_answer,
        correct_answer=question.correct_answer,
        is_correct=turn_result.is_correct,
        feedback=turn_result.feedback,
        answer_card_id=body.answer_card_id,
        support_card_id=body.support_card_id,
        meter_before=turn_result.meter_before,
        meter_delta=turn_result.meter_delta,
        meter_after=turn_result.meter_after,
        scenario_bonus_applied=getattr(turn_result, 'scenario_bonus_applied', False),
        scenario_bonus_multiplier=getattr(turn_result, 'scenario_bonus_multiplier', 1.0),
        effect_result=EffectResultOut(
            effect_type='none',
            effect_triggered=False,
            description='',
            removed_option=None,
            meter_delta_modifier=1.0,
            shield_absorbed=0,
            retry_available=False,
        ),
        ai_flavour=turn_result.ai_flavour,
    )

    next_q = await session_store.get_next_question(db, session)
    return _session_to_out(
        session,
        next_q=next_q,
        last_action=last_action,
        ai_flavour=turn_result.ai_flavour,
    )


@router.get("/{session_id}", response_model=ChallengeStateOut)
async def get_challenge(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ChallengeStateOut:
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    next_q = await session_store.get_next_question(db, session)
    return _session_to_out(session, next_q=next_q)


@router.get("/{session_id}/hand")
async def get_hand(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    session = await session_store.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "hand": session.hand or [],
        "hand_size": len(session.hand or []),
        "draw_pile_size": len(session.draw_pile or []),
        "discard_pile_size": len(session.discard_pile or []),
        "used_support_cards": session.used_support_cards or [],
        "pre_turn_used": session.pre_turn_used,
        "pre_turn_removed_option": session.pre_turn_removed_opt,
    }

"""
session_store.py — battle session state management.

Creates sessions, manages hand/draw/discard, applies turn results.
Card effects are NOT implemented (future feature) — _enrich_deck
only assigns semantic tags and star_level for the battle engine.

The deck is fetched from card-service at battle start via http_client.
After that, the fight is fully self-contained — no external calls.
"""
import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.challenge_session import ChallengeSession, ChallengeAction
from app.models.challenge_question import ChallengeQuestion
from app.services.question_engine import generate_for_deck
from app.services.content_rules import DEFAULT_METER_CONFIG
from app.core.http_client import fetch_battle_deck

HAND_SIZE = 4

XP_WIN_FULL    = 200
XP_WIN_PARTIAL = 100
PACKS_WIN_FULL    = 3
PACKS_WIN_PARTIAL = 2


def _enrich_deck(deck: list[dict]) -> list[dict]:
    """
    Enrich deck cards with semantic tags for battle display.
    star_level is already present (comes from card-service).
    familiarity_level = star_level for battle_engine compatibility.
    """
    from app.services.word_tags import get_semantic_tags

    enriched = []
    for card in deck:
        c = dict(card)
        word_fi = c.get("word_fi", "")
        c["tags"] = get_semantic_tags(word_fi)
        # Ensure familiarity_level mirrors star_level
        c["familiarity_level"] = c.get("star_level", 1)
        enriched.append(c)
    return enriched


async def create_session(
    db: AsyncSession,
    user_id: str,
    scenario: str,
) -> ChallengeSession:
    """
    Create a new battle session.

    1. Fetches battle-eligible deck from card-service (validates eligibility there)
    2. Enriches deck cards with semantic tags
    3. Generates questions via question_engine (LLM or fallback)
    4. Shuffles deck into hand + draw_pile
    5. Persists session
    """
    # Get battle deck from card-service
    deck_data = await fetch_battle_deck(user_id, scenario)
    if not deck_data.get("eligible"):
        raise ValueError(deck_data.get("reason", "Not enough eligible cards."))

    deck = deck_data["deck"]
    enriched_deck = _enrich_deck(deck)

    # Generate questions (one per card, uses LLM with fallback)
    questions = await generate_for_deck(enriched_deck, scenario)
    if not questions:
        raise RuntimeError("Question generation returned no valid questions.")

    # Persist questions
    question_ids = []
    for q in questions:
        cq = ChallengeQuestion(
            id=uuid.uuid4(),
            external_id=None,
            source=q.source,
            question_fi=q.question_fi,
            question_en=q.question_en,
            options=q.options,
            correct_answer=q.correct_answer,
            difficulty=q.difficulty,
            tags=q.valid_answers,      # valid_answers stored in tags for scoring
            deck_card_id=q.deck_card_id,
            deck_word_fi=q.deck_word_fi,
        )
        db.add(cq)
        question_ids.append(str(cq.id))

    # Build hand and draw pile
    shuffled = enriched_deck.copy()
    random.shuffle(shuffled)
    hand      = shuffled[:HAND_SIZE]
    draw_pile = shuffled[HAND_SIZE:]

    session = ChallengeSession(
        id=uuid.uuid4(),
        user_id=user_id,
        scenario=scenario,
        status="active",
        battle_meter=0,
        win_threshold=DEFAULT_METER_CONFIG.win_threshold,
        lose_threshold=DEFAULT_METER_CONFIG.lose_threshold,
        correct_base=DEFAULT_METER_CONFIG.correct_base,
        wrong_base=DEFAULT_METER_CONFIG.wrong_base,
        current_turn=1,
        max_turns=len(questions),
        question_queue=question_ids,
        deck=enriched_deck,
        hand=hand,
        draw_pile=draw_pile,
        discard_pile=[],
        used_support_cards=[],
        pre_turn_used=False,
        pre_turn_card_id=None,
        pre_turn_removed_opt=None,
        pre_turn_turn=0,
        correct_streak=0,
        max_streak=0,
        xp_earned=0,
        bonus_packs=0,
    )
    db.add(session)
    await db.flush()
    return session


async def apply_turn_result(
    db: AsyncSession,
    session: ChallengeSession,
    turn_result,
    answer_card: dict,
    support_card: dict | None,
) -> ChallengeSession:
    """Apply a TurnResult to the session and persist."""
    session.battle_meter = turn_result.meter_after
    session.current_turn += 1
    session.status       = turn_result.battle_status
    session.correct_streak = turn_result.correct_streak
    session.max_streak     = turn_result.max_streak
    session.xp_earned     += turn_result.xp_earned

    # Reset pre-turn state for next turn
    session.pre_turn_used        = False
    session.pre_turn_card_id     = None
    session.pre_turn_removed_opt = None

    # Move played cards to discard
    played_ids = {answer_card.get("card_id", "")} if answer_card else set()
    discard    = list(session.discard_pile or [])
    played     = [c for c in (session.hand or []) if c.get("card_id") in played_ids]
    discard.extend(played)
    session.discard_pile = discard

    # Refill hand
    remaining_hand = [c for c in (session.hand or []) if c.get("card_id") not in played_ids]
    draw_pile      = list(session.draw_pile or [])
    n_draw = HAND_SIZE - len(remaining_hand)

    if not draw_pile and discard:
        draw_pile = discard.copy()
        random.shuffle(draw_pile)
        session.discard_pile = []

    drawn = draw_pile[:n_draw]
    session.hand      = remaining_hand + drawn
    session.draw_pile = draw_pile[n_draw:]

    # Win rewards
    if turn_result.battle_status == "won":
        if turn_result.meter_after >= turn_result.meter_max:
            session.bonus_packs  = PACKS_WIN_FULL
            session.xp_earned   += XP_WIN_FULL
        else:
            session.bonus_packs  = PACKS_WIN_PARTIAL
            session.xp_earned   += XP_WIN_PARTIAL

    await db.flush()
    return session


async def get_session(db: AsyncSession, session_id: uuid.UUID) -> ChallengeSession | None:
    result = await db.execute(
        select(ChallengeSession).where(ChallengeSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_question(db: AsyncSession, question_id: uuid.UUID) -> ChallengeQuestion | None:
    result = await db.execute(
        select(ChallengeQuestion).where(ChallengeQuestion.id == question_id)
    )
    return result.scalar_one_or_none()


async def get_next_question(
    db: AsyncSession,
    session: ChallengeSession,
) -> ChallengeQuestion | None:
    if session.status != "active":
        return None
    queue      = session.question_queue or []
    turn_index = session.current_turn - 1
    if turn_index >= len(queue):
        return None
    result = await db.execute(
        select(ChallengeQuestion).where(
            ChallengeQuestion.id == uuid.UUID(queue[turn_index])
        )
    )
    return result.scalar_one_or_none()

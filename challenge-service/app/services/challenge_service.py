"""
Challenge service — full boss fight lifecycle.

Functions:
  start_challenge()      → creates a session, builds question queue
  process_action()       → scores answer, updates HP, logs the turn
  get_next_question()    → returns next ChallengeQuestion from queue
  get_session()          → fetches a session by ID

Architecture:
  Questions are built upfront at fight start and mirrored locally.
  For KELA boss: LLM generates questions based on the player's deck.
  After start, NO external calls are made — the fight is self-contained.

Damage model:
  Correct answer → player deals damage = max(card.power) in their deck
  Wrong answer   → AI deals flat 15 damage (AI_FLAT_DAMAGE) + taunts

End conditions (checked after every turn):
  ai_hp <= 0          → WON  (bonus_packs + xp_reward)
  player_hp <= 0      → LOST
  all turns exhausted → whoever has more HP wins (partial reward if player wins)
  tie on HP           → DRAW
"""

import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.http_client import fetch_quest_question
from app.models.challenge_question import ChallengeQuestion
from app.models.challenge_session import ChallengeAction, ChallengeSession
from app.services import kela_boss

settings = get_settings()

# KELA boss fight constants
KELA_XP_REWARD    = 200
KELA_BONUS_PACKS  = 3

# Card rarity → battle power (mirrors card-service values)
RARITY_POWER: dict[str, int] = {
    "Common":    5,
    "Uncommon":  10,
    "Rare":      20,
    "Epic":      35,
    "Legendary": 50,
}


async def start_challenge(
    db: AsyncSession,
    user_id: str,
    deck: list[dict],
) -> ChallengeSession:
    """
    Start a new KELA boss fight.

    Validates deck size, generates the full question queue via LLM,
    and creates the ChallengeSession row.
    """
    if len(deck) < settings.KELA_MIN_DECK_SIZE:
        raise ValueError(
            f"KELA requires at least {settings.KELA_MIN_DECK_SIZE} cards. "
            f"You have {len(deck)}."
        )

    # Generate all questions upfront — LLM call happens here, not during the fight
    questions = await kela_boss.generate_questions(db, deck)

    if not questions:
        raise RuntimeError(
            "KELA question generation returned no valid questions. "
            "Check LLM backend configuration."
        )

    session = ChallengeSession(
        id=uuid.uuid4(),
        user_id=user_id,
        scenario="kela_boss",
        status="active",
        player_hp=settings.PLAYER_MAX_HP,
        ai_hp=settings.AI_MAX_HP,
        current_turn=1,
        question_queue=[str(q.id) for q in questions],
        deck=deck,
        xp_earned=0,
        bonus_packs=0,
    )

    db.add(session)
    await db.flush()
    return session


async def process_action(
    db: AsyncSession,
    session: ChallengeSession,
    question_id: uuid.UUID,
    given_answer: str,
) -> tuple[ChallengeSession, dict]:
    """
    Process one player turn.

    Scores the answer, updates HP, logs the action, checks end conditions.
    Returns (updated_session, action_summary_dict).
    """
    if session.status != "active":
        raise ValueError("This boss fight is already over.")

    # Fetch the question
    result = await db.execute(
        select(ChallengeQuestion).where(ChallengeQuestion.id == question_id)
    )
    question = result.scalar_one_or_none()
    if question is None:
        raise ValueError(f"Question {question_id} not found.")

    # Score — case-insensitive exact match
    is_correct = question.correct_answer.strip().lower() == given_answer.strip().lower()
    xp = 10 if is_correct else 2
    ai_flavour = None
    damage_dealt = 0
    damage_taken = 0

    if is_correct:
        # Player deals damage equal to their best card's power
        damage_dealt = _best_card_power(session.deck)
        session.ai_hp = max(0, session.ai_hp - damage_dealt)
    else:
        # AI deals flat damage and taunts
        damage_taken = settings.AI_FLAT_DAMAGE
        session.player_hp = max(0, session.player_hp - damage_taken)
        ai_flavour = random.choice(kela_boss.KELA_TAUNTS)

    session.xp_earned += xp
    session.current_turn += 1

    # Log this turn
    db.add(ChallengeAction(
        id=uuid.uuid4(),
        session_id=session.id,
        turn=session.current_turn - 1,
        question_id=question_id,
        given_answer=given_answer,
        is_correct=is_correct,
        damage_dealt=damage_dealt,
        damage_taken=damage_taken,
    ))

    # Check if the fight should end
    _check_end_conditions(session)

    await db.flush()

    return session, {
        "turn": session.current_turn - 1,
        "question_id": str(question_id),
        "given_answer": given_answer,
        "correct_answer": question.correct_answer,
        "is_correct": is_correct,
        "feedback": "Correct!" if is_correct else f'The answer was "{question.correct_answer}".',
        "damage_dealt": damage_dealt,
        "damage_taken": damage_taken,
        "player_hp": session.player_hp,
        "ai_hp": session.ai_hp,
        "ai_flavour": ai_flavour,
    }


async def get_next_question(
    db: AsyncSession,
    session: ChallengeSession,
) -> ChallengeQuestion | None:
    """Return the next question based on current_turn. None if fight is over."""
    if session.status != "active":
        return None

    queue = session.question_queue
    turn_index = session.current_turn - 1

    if turn_index >= len(queue):
        return None

    result = await db.execute(
        select(ChallengeQuestion).where(
            ChallengeQuestion.id == uuid.UUID(queue[turn_index])
        )
    )
    return result.scalar_one_or_none()


async def get_session(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> ChallengeSession | None:
    """Fetch a fight session by ID."""
    result = await db.execute(
        select(ChallengeSession).where(ChallengeSession.id == session_id)
    )
    return result.scalar_one_or_none()


# ── Private helpers ────────────────────────────────────────────────────────────

def _best_card_power(deck: list[dict]) -> int:
    """Return the highest power value in the player's deck. Fallback: 10."""
    if not deck:
        return 10
    powers = []
    for card in deck:
        power = card.get("power")
        if power is None:
            power = RARITY_POWER.get(card.get("rarity", "Common"), 5)
        powers.append(power)
    return max(powers)


def _check_end_conditions(session: ChallengeSession) -> None:
    """Update session status if the fight should end. Called after every turn."""
    max_turns = len(session.question_queue)

    if session.ai_hp <= 0:
        session.status = "won"
        session.bonus_packs = KELA_BONUS_PACKS
        session.xp_earned += KELA_XP_REWARD
        return

    if session.player_hp <= 0:
        session.status = "lost"
        return

    # All turns used — compare HP
    if session.current_turn > max_turns:
        if session.player_hp > session.ai_hp:
            session.status = "won"
            session.bonus_packs = max(1, KELA_BONUS_PACKS - 1)
            session.xp_earned += KELA_XP_REWARD // 2
        elif session.ai_hp > session.player_hp:
            session.status = "lost"
        else:
            session.status = "draw"

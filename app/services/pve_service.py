"""
PvE service---

Manages the full lifecycle of a battle session:
  - start_battle() - creates the session and builds the challenge queue
  - process_action()-scores an answer, updates HP, advances the turn
  - get_next_challenge() -returns the next challenge from the queue
  - get_session()-fetches a session by ID

Battle loop per turn:
  - Player picks an answer from 4 options
  - Correct → player deals damage to AI (card power from their best card)
  - Wrong   → AI deals flat damage to player + flavour taunt
  - Battle ends when either HP hits 0 or all turns are used

For kela_boss:
  - Challenges come from the LLM boss service
  - Turn count is deck_size - 2
  - Minimum deck size is enforced before starting

For all other scenarios:
  - Challenges are pulled from seed data filtered by scenario tag
  - Turn count is fixed in the scenario definition
"""

import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.data.battle_scenarios import SCENARIOS
from app.models.battle import BattleAction, BattleSession, BattleStatus
from app.models.challenge import Challenge
from app.services import challenge_service, llm_boss
from app.services.rarity_engine import RARITY_POWER

settings = get_settings()


async def start_battle(
    db: AsyncSession,
    user_id: str,
    scenario: str,
    deck: list[dict],
) -> BattleSession:
    """
    Create a new battle session.

    Builds the full challenge queue upfront so every subsequent
    request just reads from it - no generation during the fight.
    """
    if scenario not in SCENARIOS:
        raise ValueError(
            f"Unknown scenario '{scenario}'. "
            f"Valid options: {list(SCENARIOS.keys())}"
        )

    scenario_data = SCENARIOS[scenario]

    # Enforce minimum deck size for KELA
    if scenario_data.get("uses_llm"):
        min_size = scenario_data.get("min_deck_size", settings.KELA_MIN_DECK_SIZE)
        if len(deck) < min_size:
            raise ValueError(
                f"KELA requires at least {min_size} cards in your deck. "
                f"You only have {len(deck)}."
            )

    # Build challenge queue
    challenges = await _build_challenge_queue(db, scenario, scenario_data, deck)

    if not challenges:
        raise ValueError(
            "Could not generate challenges for this battle. "
            "Make sure the database has been seeded."
        )

    challenge_ids = [str(c.id) for c in challenges]
    max_turns = len(challenges)

    session = BattleSession(
        id=uuid.uuid4(),
        user_id=user_id,
        scenario=scenario,
        status=BattleStatus.ACTIVE,
        player_hp=settings.PLAYER_MAX_HP,
        ai_hp=settings.AI_MAX_HP,
        current_turn=1,
        challenge_queue=challenge_ids,
        deck=deck,
        xp_earned=0,
        bonus_packs=0,
    )

    db.add(session)
    await db.flush()
    return session


async def process_action(
    db: AsyncSession,
    session: BattleSession,
    challenge_id: uuid.UUID,
    given_answer: str,
) -> tuple[BattleSession, dict]:
    """
    Process one player turn.

    Returns the updated session and an action summary dict
    that gets sent back to Node.js in the response.
    """
    if session.status != BattleStatus.ACTIVE:
        raise ValueError("This battle is already over.")

    # Load the challenge
    result = await db.execute(
        select(Challenge).where(Challenge.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if challenge is None:
        raise ValueError(f"Challenge {challenge_id} not found.")

    # Score the answer
    is_correct, feedback, xp, pack_score = challenge_service.score_answer(
        challenge.correct_answer, given_answer
    )

    # Calculate damage
    damage_dealt = 0
    damage_taken = 0
    ai_flavour = None

    if is_correct:
        damage_dealt = _best_card_power(session.deck)
        session.ai_hp = max(0, session.ai_hp - damage_dealt)
    else:
        damage_taken = settings.AI_FLAT_DAMAGE
        session.player_hp = max(0, session.player_hp - damage_taken)
        ai_flavour = _pick_flavour(session.scenario)

    # Accumulate XP
    session.xp_earned += xp
    session.current_turn += 1

    # Log the action
    action = BattleAction(
        id=uuid.uuid4(),
        session_id=session.id,
        turn=session.current_turn - 1,
        challenge_id=challenge_id,
        given_answer=given_answer,
        is_correct=is_correct,
        damage_dealt=damage_dealt,
        damage_taken=damage_taken,
    )
    db.add(action)

    # Check end conditions
    max_turns = len(session.challenge_queue)
    _check_end_conditions(session, max_turns)

    await db.flush()

    action_summary = {
        "turn": session.current_turn - 1,
        "challenge_id": str(challenge_id),
        "given_answer": given_answer,
        "correct_answer": challenge.correct_answer,
        "is_correct": is_correct,
        "feedback": feedback,
        "damage_dealt": damage_dealt,
        "damage_taken": damage_taken,
        "player_hp": session.player_hp,
        "ai_hp": session.ai_hp,
        "ai_flavour": ai_flavour,
    }

    return session, action_summary


async def get_next_challenge(
    db: AsyncSession,
    session: BattleSession,
) -> Challenge | None:
    """
    Return the next challenge in the queue based on the current turn.
    Returns None when the battle is over or the queue is exhausted.
    """
    if session.status != BattleStatus.ACTIVE:
        return None

    queue: list[str] = session.challenge_queue
    turn_index = session.current_turn - 1

    if turn_index >= len(queue):
        return None

    challenge_id = uuid.UUID(queue[turn_index])
    result = await db.execute(
        select(Challenge).where(Challenge.id == challenge_id)
    )
    return result.scalar_one_or_none()


async def get_session(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> BattleSession | None:
    """Fetch a battle session by ID."""
    result = await db.execute(
        select(BattleSession).where(BattleSession.id == session_id)
    )
    return result.scalar_one_or_none()

# Helper functions

async def _build_challenge_queue(
    db: AsyncSession,
    scenario: str,
    scenario_data: dict,
    deck: list[dict],
) -> list[Challenge]:
    """
    Build the full list of challenges for this battle upfront.

    KELA: delegates to the LLM boss service.
    Others: pulls from seed data filtered by scenario tag.
    """
    if scenario_data.get("uses_llm"):
        return await llm_boss.generate_kela_challenges(db, deck)

    # Fixed turn count from scenario definition
    num_turns = scenario_data["turns"]
    tag = scenario_data["tag"]
    diff_min = scenario_data["difficulty_min"]
    diff_max = scenario_data["difficulty_max"]

    # Spread difficulty evenly across the turns
    difficulties = _spread_difficulties(diff_min, diff_max, num_turns)
    challenges: list[Challenge] = []

    for diff in difficulties:
        try:
            ch = await challenge_service.generate_challenge(
                db,
                user_id="battle",
                scenario_tag=tag,
                difficulty_target=diff,
            )
            challenges.append(ch)
        except ValueError:
            # Not enough content for this difficulty - try without difficulty filter
            try:
                ch = await challenge_service.generate_challenge(
                    db,
                    user_id="battle",
                    scenario_tag=tag,
                )
                challenges.append(ch)
            except ValueError:
                pass  # Skip if no content at all for this scenario

    return challenges


def _spread_difficulties(lo: float, hi: float, n: int) -> list[float]:
    """
    Return n difficulty values spread from lo to hi with slight random jitter.
    This means battles start easier and get harder toward the end.
    """
    if n <= 1:
        return [lo]
    step = (hi - lo) / (n - 1)
    values = [lo + i * step for i in range(n)]
    # Add small jitter so turns are not perfectly predictable
    jitter = step * 0.2
    return [
        max(lo, min(hi, v + random.uniform(-jitter, jitter)))
        for v in values
    ]


def _best_card_power(deck: list[dict]) -> int:
    """
    Return the highest power value among the player's cards.
    This is the damage dealt on a correct answer.
    Falls back to 10 if the deck is empty or malformed.
    """
    if not deck:
        return 10
    powers = []
    for card in deck:
        power = card.get("power")
        if power is None:
            # Compute from rarity if power not set
            rarity = card.get("rarity", "Common")
            power = RARITY_POWER.get(rarity, 5)
        powers.append(power)
    return max(powers)


def _pick_flavour(scenario: str) -> str:
    """Pick a random wrong-answer taunt for the given scenario."""
    scenario_data = SCENARIOS.get(scenario, {})
    taunts = scenario_data.get("ai_wrong_answer", ["..."])
    return random.choice(taunts)


def _check_end_conditions(session: BattleSession, max_turns: int) -> None:
    """
    Update session status if the battle should end.
    Called after every turn.
    """
    scenario_data = SCENARIOS[session.scenario]

    if session.ai_hp <= 0:
        session.status = BattleStatus.WON
        session.bonus_packs = scenario_data["bonus_packs"]
        session.xp_earned += scenario_data["xp_reward"]
        return

    if session.player_hp <= 0:
        session.status = BattleStatus.LOST
        return

    # All turns used - whoever has more HP wins
    if session.current_turn > max_turns:
        if session.player_hp > session.ai_hp:
            session.status = BattleStatus.WON
            session.bonus_packs = max(1, scenario_data["bonus_packs"] - 1)
            session.xp_earned += scenario_data["xp_reward"] // 2
        elif session.ai_hp > session.player_hp:
            session.status = BattleStatus.LOST
        else:
            session.status = BattleStatus.DRAW

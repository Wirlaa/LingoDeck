"""
session_store.py — battle session state management.

Handles:
  - Creating a new battle session (deck → hand + draw_pile)
  - Persisting session state after each turn
  - Fetching sessions and questions from DB
  - Managing hand, draw pile, and discard pile

Battle state structure:
  hand         — cards currently available to play (3-5 cards)
  draw_pile    — remaining cards not yet in hand
  discard_pile — cards already played
  used_support_cards — IDs of support cards used this fight

Hand management:
  At fight start: shuffle deck, draw HAND_SIZE cards into hand
  After each turn: played cards → discard, draw from draw_pile to refill
  If draw_pile empty: reshuffle discard into draw_pile (endless loop)
"""

import random
import uuid
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.challenge_session import ChallengeSession
from app.models.challenge_question import ChallengeQuestion
from app.services.question_engine import GeneratedQuestion, generate_for_deck
from app.services.content_rules import MeterConfig, DEFAULT_METER_CONFIG, SCENARIO_INFO

# Number of cards in hand at any time
HAND_SIZE = 4

# Minimum deck size for a battle
MIN_DECK_SIZE = 6

# XP and pack rewards
XP_WIN_FULL    = 200
XP_WIN_PARTIAL = 100
PACKS_WIN_FULL    = 3
PACKS_WIN_PARTIAL = 2


def _assign_effect_types(deck: list[dict]) -> list[dict]:
    """
    Assign effect_type and tags to each card.

    effect_type — rarity-based (game balance)
    tags        — semantic content tags (from word meaning via word_tags.py)
                  PLUS rarity effect tag

    IMPORTANT: always overwrites tags, never uses setdefault.
    DeckCard schema defaults tags=[], so setdefault would silently leave
    empty lists — breaking scenario bonus and combo effects.
    """
    from app.services.content_rules import EffectType, Tag
    from app.services.word_tags import get_semantic_tags

    rarity_effects = {
        "Common":    EffectType.SHIELD,
        "Uncommon":  EffectType.BOOST,
        "Rare":      EffectType.FOCUS,
        "Epic":      EffectType.RETRY,
        "Legendary": EffectType.COMBO,
    }
    rarity_effect_tags = {
        "Common":    Tag.SHIELD,
        "Uncommon":  Tag.BOOST,
        "Rare":      Tag.FOCUS,
        "Epic":      Tag.RETRY,
        "Legendary": Tag.COMBO,
    }

    enriched = []
    for card in deck:
        c = dict(card)
        rarity  = c.get("rarity", "Common")
        word_fi = c.get("word_fi", "")

        # Always overwrite effect_type — do not use setdefault
        c["effect_type"] = rarity_effects.get(rarity, EffectType.NONE)

        # Build tags from scratch every time:
        #   semantic tags (what the word means) + effect tag (from rarity)
        semantic   = get_semantic_tags(word_fi)
        effect_tag = rarity_effect_tags.get(rarity)
        c["tags"]  = list(set(semantic + ([effect_tag] if effect_tag else [])))

        c.setdefault("effect_strength", 1.0)
        enriched.append(c)
    return enriched


async def create_session(
    db: AsyncSession,
    user_id: str,
    deck: list[dict],
    scenario: str,
) -> ChallengeSession:
    """
    Create a new battle session.

    Steps:
      1. Validate deck size
      2. Enrich cards with effect types and tags
      3. Generate questions via question_engine
      4. Shuffle deck into draw_pile, deal HAND_SIZE cards to hand
      5. Create and persist ChallengeSession

    Returns persisted ChallengeSession.
    """
    if len(deck) < MIN_DECK_SIZE:
        raise ValueError(
            f"Need at least {MIN_DECK_SIZE} cards. You have {len(deck)}."
        )

    # Enrich cards
    enriched_deck = _assign_effect_types(deck)

    # Generate questions
    questions = await generate_for_deck(enriched_deck, scenario)
    if not questions:
        raise RuntimeError(
            "Question generation returned no valid questions. "
            "Check LLM backend or try a different scenario."
        )

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
            tags=q.tags,
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
    turn_result,  # TurnResult from battle_engine
    answer_card: dict,
    support_card: dict | None,
) -> ChallengeSession:
    """
    Apply a TurnResult to the session and persist.

    Updates:
      - battle_meter
      - current_turn
      - status
      - hand, draw_pile, discard_pile
      - used_support_cards
      - xp_earned, bonus_packs
    """
    # Update meter and turn
    session.battle_meter = turn_result.meter_after
    session.current_turn += 1
    session.status = turn_result.battle_status

    # Update hand/discard
    played_ids = set()
    if answer_card:
        played_ids.add(answer_card.get("card_id", ""))
    if support_card:
        played_ids.add(support_card.get("card_id", ""))
        session.used_support_cards = list(
            set(session.used_support_cards or []) | played_ids
        )

    # Move played cards to discard
    discard = list(session.discard_pile or [])
    played  = [c for c in (session.hand or []) if c.get("card_id") in played_ids]
    discard.extend(played)
    session.discard_pile = discard

    # Remove from hand, draw replacement
    remaining_hand = [c for c in (session.hand or []) if c.get("card_id") not in played_ids]
    draw_pile      = list(session.draw_pile or [])

    n_draw = HAND_SIZE - len(remaining_hand)
    if not draw_pile and discard:
        # Reshuffle discard into draw pile
        draw_pile = discard.copy()
        random.shuffle(draw_pile)
        session.discard_pile = []

    drawn = draw_pile[:n_draw]
    draw_pile = draw_pile[n_draw:]
    remaining_hand.extend(drawn)

    session.hand      = remaining_hand
    session.draw_pile = draw_pile

    # Combo chain state
    session.correct_streak = turn_result.correct_streak
    session.max_streak     = turn_result.max_streak

    # XP and packs
    session.xp_earned += turn_result.xp_earned

    if turn_result.battle_status == "won":
        if turn_result.meter_after >= turn_result.meter_max:
            session.bonus_packs = PACKS_WIN_FULL
            session.xp_earned  += XP_WIN_FULL
        else:
            session.bonus_packs = PACKS_WIN_PARTIAL
            session.xp_earned  += XP_WIN_PARTIAL

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
    """Return the question for the current turn."""
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

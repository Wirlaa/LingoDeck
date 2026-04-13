"""
Card service — pack opening, card ownership, star upgrades, scenario unlocks.

Pack opening flow:
  1. Roll PACK_SIZE rarity tiers (weighted toward Common)
  2. For each slot, pick a word from language_content matching that rarity
     - If scenario_bias set, 70% chance the word is from that scenario
     - Otherwise random across all active words
  3. For each word:
     a. User already owns it → add XP (5 XP, like a duplicate)
     b. User doesn't own it → create UserCard at 1★, 0 XP
  4. Return the list of card results

XP system:
  add_xp(user_id, word_fi, xp) — adds XP and handles star-ups
  Max star is 4. At max star, XP accumulates as duplicate bonus but
  no further star-up happens.

Battle eligibility:
  get_battle_deck(user_id, scenario) → list of cards at ≥ BATTLE_MIN_STAR
  Returns empty list (not error) if not enough cards.
"""
import random
import uuid

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.language_content import LanguageContent
from app.models.scenario_unlock import ScenarioUnlock, DEFAULT_UNLOCK, SCENARIO_ORDER, next_scenario
from app.models.user_card import UserCard, STAR_XP_THRESHOLDS, MAX_STAR
from app.services.rarity_engine import difficulty_to_rarity, roll_target_rarity, RARITY_DIFFICULTY_BANDS

settings = get_settings()

DUPLICATE_XP = 5


# ── Scenario unlocks ──────────────────────────────────────────────────────────

async def ensure_cafe_unlocked(db: AsyncSession, user_id: str) -> None:
    """Ensure the user has café unlocked. Called on first quest attempt."""
    result = await db.execute(
        select(ScenarioUnlock).where(
            and_(ScenarioUnlock.user_id == user_id,
                 ScenarioUnlock.scenario == DEFAULT_UNLOCK)
        )
    )
    if result.scalar_one_or_none() is None:
        db.add(ScenarioUnlock(id=uuid.uuid4(), user_id=user_id, scenario=DEFAULT_UNLOCK))
        await db.flush()


async def get_unlocked_scenarios(db: AsyncSession, user_id: str) -> list[str]:
    result = await db.execute(
        select(ScenarioUnlock.scenario).where(ScenarioUnlock.user_id == user_id)
    )
    return [row[0] for row in result.fetchall()]


async def unlock_next_scenario(db: AsyncSession, user_id: str, beaten_scenario: str) -> str | None:
    """
    Called after a user wins a big battle. Unlocks the next scenario in the chain.
    Returns the name of the newly unlocked scenario, or None if already at end.
    """
    nxt = next_scenario(beaten_scenario)
    if nxt is None:
        return None

    result = await db.execute(
        select(ScenarioUnlock).where(
            and_(ScenarioUnlock.user_id == user_id, ScenarioUnlock.scenario == nxt)
        )
    )
    if result.scalar_one_or_none() is None:
        db.add(ScenarioUnlock(id=uuid.uuid4(), user_id=user_id, scenario=nxt))
        await db.flush()
    return nxt


# ── Pack opening ──────────────────────────────────────────────────────────────

async def open_pack(
    db: AsyncSession,
    user_id: str,
    scenario_bias: str | None = None,
) -> list[dict]:
    """
    Open a card pack. Returns list of PACK_SIZE card result dicts.

    Each result:
      { word_fi, word_en, scenario, rarity, star_level, is_new, xp_gained }
    """
    results = []
    for _ in range(settings.PACK_SIZE):
        target_rarity = roll_target_rarity()
        word = await _pick_word(db, target_rarity, scenario_bias)
        if word is None:
            # Fallback: pick any active word at that rarity
            word = await _pick_word(db, target_rarity, None)
        if word is None:
            continue

        result = await _grant_card(db, user_id, word)
        results.append(result)

    return results


async def _pick_word(
    db: AsyncSession,
    target_rarity: str,
    scenario_bias: str | None,
) -> LanguageContent | None:
    """Pick one word from the wordbank. Applies scenario bias if set."""
    band = RARITY_DIFFICULTY_BANDS.get(target_rarity, (0.0, 0.2))
    use_bias = (
        scenario_bias is not None
        and random.random() < settings.SCENARIO_BIAS_CHANCE
    )

    q = select(LanguageContent).where(
        and_(
            LanguageContent.is_active == True,
            LanguageContent.difficulty >= band[0],
            LanguageContent.difficulty <= band[1],
        )
    )
    if use_bias:
        q = q.where(LanguageContent.scenario_tags.contains(scenario_bias))

    result = await db.execute(q)
    words = result.scalars().all()
    return random.choice(words) if words else None


async def _grant_card(db: AsyncSession, user_id: str, word: LanguageContent) -> dict:
    """Add card to user's collection or add XP if duplicate."""
    result = await db.execute(
        select(UserCard).where(
            and_(UserCard.user_id == user_id, UserCard.word_fi == word.target_fi)
        )
    )
    existing = result.scalar_one_or_none()

    scenario = _primary_scenario(word.scenario_tags)

    if existing is not None:
        xp_gained = DUPLICATE_XP
        existing.duplicate_count += 1
        _apply_xp(existing, xp_gained)
        await db.flush()
        return {
            "word_fi":    word.target_fi,
            "word_en":    word.target_en,
            "scenario":   scenario,
            "rarity":     existing.rarity,
            "star_level": existing.star_level,
            "is_new":     False,
            "xp_gained":  xp_gained,
        }
    else:
        card = UserCard(
            id=uuid.uuid4(),
            user_id=user_id,
            word_fi=word.target_fi,
            word_en=word.target_en,
            scenario=scenario,
            rarity=word.rarity,
            difficulty=word.difficulty,
            star_level=1,
            xp=0,
            duplicate_count=0,
        )
        db.add(card)
        await db.flush()
        return {
            "word_fi":    word.target_fi,
            "word_en":    word.target_en,
            "scenario":   scenario,
            "rarity":     word.rarity,
            "star_level": 1,
            "is_new":     True,
            "xp_gained":  0,
        }


# ── XP and star upgrades ──────────────────────────────────────────────────────

async def add_xp(
    db: AsyncSession,
    user_id: str,
    word_fi: str,
    xp: int,
) -> dict | None:
    """
    Add XP to a user's card. Returns updated card dict, or None if card not found.
    Handles star-ups automatically.
    """
    result = await db.execute(
        select(UserCard).where(
            and_(UserCard.user_id == user_id, UserCard.word_fi == word_fi)
        )
    )
    card = result.scalar_one_or_none()
    if card is None:
        return None

    starred_up = _apply_xp(card, xp)
    await db.flush()
    return {
        "word_fi":    card.word_fi,
        "star_level": card.star_level,
        "xp":         card.xp,
        "starred_up": starred_up,
        "xp_to_next": _xp_to_next(card),
    }


def _apply_xp(card: UserCard, xp: int) -> bool:
    """Add xp to card and handle star-ups. Returns True if starred up."""
    if card.star_level >= MAX_STAR:
        card.duplicate_count += 1
        return False

    card.xp += xp
    threshold = STAR_XP_THRESHOLDS.get(card.star_level, 999)
    if card.xp >= threshold:
        card.xp -= threshold
        card.star_level = min(card.star_level + 1, MAX_STAR)
        return True
    return False


def _xp_to_next(card: UserCard) -> int | None:
    if card.star_level >= MAX_STAR:
        return None
    return STAR_XP_THRESHOLDS[card.star_level] - card.xp


# ── Collection queries ────────────────────────────────────────────────────────

async def get_collection(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(UserCard).where(UserCard.user_id == user_id).order_by(UserCard.scenario, UserCard.star_level.desc())
    )
    return [_card_to_dict(c) for c in result.scalars().all()]


async def get_battle_deck(
    db: AsyncSession,
    user_id: str,
    scenario: str,
) -> dict:
    """
    Return the user's battle-eligible deck for a scenario.

    Eligible = star_level >= BATTLE_MIN_STAR and scenario matches.
    Returns { eligible, deck, card_count, reason }.
    """
    result = await db.execute(
        select(UserCard).where(
            and_(
                UserCard.user_id == user_id,
                UserCard.scenario == scenario,
                UserCard.star_level >= settings.BATTLE_MIN_STAR,
            )
        ).order_by(UserCard.star_level.desc())
    )
    cards = result.scalars().all()

    if len(cards) < settings.BATTLE_MIN_CARDS:
        return {
            "eligible":   False,
            "deck":       [],
            "card_count": len(cards),
            "reason": (
                f"Need at least {settings.BATTLE_MIN_CARDS} cards at "
                f"{settings.BATTLE_MIN_STAR}★ or higher for {scenario}. "
                f"You have {len(cards)}."
            ),
        }

    return {
        "eligible":   True,
        "deck":       [_card_to_battle_dict(c) for c in cards],
        "card_count": len(cards),
        "reason":     None,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _primary_scenario(scenario_tags: str) -> str:
    """Pick first scenario tag, fallback to 'general'."""
    if not scenario_tags:
        return "general"
    return scenario_tags.split(",")[0].strip()


def _card_to_dict(card: UserCard) -> dict:
    return {
        "card_id":       str(card.id),
        "word_fi":       card.word_fi,
        "word_en":       card.word_en,
        "scenario":      card.scenario,
        "rarity":        card.rarity,
        "difficulty":    card.difficulty,
        "star_level":    card.star_level,
        "xp":            card.xp,
        "xp_to_next":    _xp_to_next(card),
        "duplicate_count": card.duplicate_count,
    }


def _card_to_battle_dict(card: UserCard) -> dict:
    """Minimal dict for battle deck — what challenge-service needs."""
    return {
        "card_id":          str(card.id),
        "word_fi":          card.word_fi,
        "word_en":          card.word_en,
        "scenario":         card.scenario,
        "rarity":           card.rarity,
        "difficulty":       card.difficulty,
        "star_level":       card.star_level,
        "familiarity_level": card.star_level,  # challenge-service uses this key
    }

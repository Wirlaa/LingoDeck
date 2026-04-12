"""
Rarity engine — rolls card packs with weighted rarity distribution.

How it works:
  1. Receive pack_score (0.0-1.0) from the quest submission result
  2. Compute adjusted weights — higher pack_score boosts rare tiers
  3. Roll PACK_SIZE rarities using weighted random.choices
  4. For each rolled rarity, fetch a random LanguageContent row
     from the matching difficulty band
  5. Return as PackCard objects — Node.js saves them to inventory

Base rarity weights (at pack_score = 0.0):
  Common:    50
  Uncommon:  30
  Rare:      14
  Epic:       5
  Legendary:  1

At pack_score = 1.0:
  Common weight halved, Legendary weight 10x — much higher chance of rare pulls.
"""

import random
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import func

from app.core.config import get_settings
from app.models.language_content import LanguageContent, Rarity

settings = get_settings()

# Difficulty bands that define each rarity tier
RARITY_BANDS: dict[str, tuple[float, float]] = {
    Rarity.COMMON:    (0.00, 0.20),
    Rarity.UNCOMMON:  (0.21, 0.40),
    Rarity.RARE:      (0.41, 0.60),
    Rarity.EPIC:      (0.61, 0.80),
    Rarity.LEGENDARY: (0.81, 1.00),
}

# Battle power per rarity tier — used in damage calculation during boss fights
RARITY_POWER: dict[str, int] = {
    Rarity.COMMON:    5,
    Rarity.UNCOMMON:  10,
    Rarity.RARE:      20,
    Rarity.EPIC:      35,
    Rarity.LEGENDARY: 50,
}

BASE_WEIGHTS: dict[str, float] = {
    Rarity.COMMON:    50.0,
    Rarity.UNCOMMON:  30.0,
    Rarity.RARE:      14.0,
    Rarity.EPIC:       5.0,
    Rarity.LEGENDARY:  1.0,
}


@dataclass
class PackCard:
    """One card result from a pack opening."""
    content_id: uuid.UUID
    sentence_fi: str
    sentence_en: str
    target_fi: str
    target_en: str
    rarity: str
    difficulty: float
    content_type: str       # "noun" | "phrase" | "idiom"
    power: int = field(init=False)

    def __post_init__(self) -> None:
        self.power = RARITY_POWER.get(self.rarity, 5)


async def open_pack(
    db: AsyncSession,
    pack_score: float,
    scenario_tags: list[str] | None = None,
) -> list[PackCard]:
    """
    Roll one pack and return its cards.

    pack_score shifts weight toward rarer tiers.
    scenario_tags optionally biases cards toward a specific scenario.
    """
    weights = _compute_weights(pack_score)
    rarities = random.choices(
        list(weights.keys()),
        weights=list(weights.values()),
        k=settings.PACK_SIZE,
    )

    cards: list[PackCard] = []
    for rarity in rarities:
        row = await _fetch_for_rarity(db, rarity, scenario_tags)
        if row is None:
            # Fallback: grab any active row if nothing matches this rarity band
            row = await _fetch_any(db)
        if row:
            cards.append(PackCard(
                content_id=row.id,
                sentence_fi=row.sentence_fi,
                sentence_en=row.sentence_en,
                target_fi=row.target_fi,
                target_en=row.target_en,
                rarity=rarity,
                difficulty=row.difficulty,
                content_type=getattr(row, "content_type", "phrase"),
            ))

    return cards


def _compute_weights(pack_score: float) -> dict[str, float]:
    """
    Adjust rarity weights based on pack_score.
    Linear interpolation between base weights (score=0) and boosted weights (score=1).
    """
    boost = pack_score
    return {
        Rarity.COMMON:    BASE_WEIGHTS[Rarity.COMMON]    * (1 - boost * 0.5),
        Rarity.UNCOMMON:  BASE_WEIGHTS[Rarity.UNCOMMON],
        Rarity.RARE:      BASE_WEIGHTS[Rarity.RARE]      * (1 + boost * 1.5),
        Rarity.EPIC:      BASE_WEIGHTS[Rarity.EPIC]      * (1 + boost * 4.0),
        Rarity.LEGENDARY: BASE_WEIGHTS[Rarity.LEGENDARY] * (1 + boost * 9.0),
    }


async def _fetch_for_rarity(
    db: AsyncSession,
    rarity: str,
    scenario_tags: list[str] | None,
) -> LanguageContent | None:
    """Fetch a random active row matching the given rarity's difficulty band."""
    lo, hi = RARITY_BANDS.get(rarity, (0.0, 1.0))
    query = (
        select(LanguageContent)
        .where(
            LanguageContent.is_active.is_(True),
            LanguageContent.difficulty >= lo,
            LanguageContent.difficulty <= hi,
        )
        .order_by(func.random())
        .limit(1)
    )
    if scenario_tags:
        query = query.where(LanguageContent.scenario_tags.contains(scenario_tags[0]))

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _fetch_any(db: AsyncSession) -> LanguageContent | None:
    """Last resort fallback — grab any active row."""
    result = await db.execute(
        select(LanguageContent)
        .where(LanguageContent.is_active.is_(True))
        .order_by(func.random())
        .limit(1)
    )
    return result.scalar_one_or_none()

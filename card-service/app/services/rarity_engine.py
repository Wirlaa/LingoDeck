"""
Rarity engine — SKELETON.

Implement all functions marked with raise NotImplementedError.
The full implementation is in the full/ version for reference.

Rarity bands (difficulty → rarity):
  Common    0.00-0.20  power 5
  Uncommon  0.21-0.40  power 10
  Rare      0.41-0.60  power 20
  Epic      0.61-0.80  power 35
  Legendary 0.81-1.00  power 50

Base weights: Common=50, Uncommon=30, Rare=14, Epic=5, Legendary=1
At pack_score=1.0: Common halved, Legendary 10x.
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

RARITY_BANDS: dict[str, tuple[float, float]] = {
    Rarity.COMMON:    (0.00, 0.20),
    Rarity.UNCOMMON:  (0.21, 0.40),
    Rarity.RARE:      (0.41, 0.60),
    Rarity.EPIC:      (0.61, 0.80),
    Rarity.LEGENDARY: (0.81, 1.00),
}

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
    content_id: uuid.UUID
    sentence_fi: str
    sentence_en: str
    target_fi: str
    target_en: str
    rarity: str
    difficulty: float
    power: int = field(init=False)

    def __post_init__(self) -> None:
        self.power = RARITY_POWER.get(self.rarity, 5)


async def open_pack(
    db: AsyncSession,
    pack_score: float,
    scenario_tags: list[str] | None = None,
) -> list[PackCard]:
    """
    Roll one pack and return cards.

    TODO:
      1. Call _compute_weights(pack_score)
      2. Use random.choices() with the weights to roll PACK_SIZE rarities
      3. For each rarity, call _fetch_for_rarity()
      4. Fallback to _fetch_any() if nothing matches
      5. Return list of PackCard
    """
    raise NotImplementedError


def _compute_weights(pack_score: float) -> dict[str, float]:
    """
    Shift weights based on pack_score (0.0-1.0).

    TODO:
      At pack_score=0: use BASE_WEIGHTS as-is
      At pack_score=1:
        Common *= (1 - 0.5)   → halved
        Rare   *= (1 + 1.5)   → 2.5x
        Epic   *= (1 + 4.0)   → 5x
        Legendary *= (1 + 9.0) → 10x
      Linear interpolation between 0 and 1.
    """
    raise NotImplementedError


async def _fetch_for_rarity(
    db: AsyncSession,
    rarity: str,
    scenario_tags: list[str] | None,
) -> LanguageContent | None:
    """
    Fetch a random active LanguageContent row in the rarity's difficulty band.

    TODO:
      - Use RARITY_BANDS[rarity] to get (lo, hi) difficulty range
      - Filter by difficulty >= lo and difficulty <= hi
      - Optionally filter by scenario_tags[0] if provided
      - ORDER BY random(), LIMIT 1
    """
    raise NotImplementedError


async def _fetch_any(db: AsyncSession) -> LanguageContent | None:
    """Last resort fallback — grab any active row."""
    raise NotImplementedError

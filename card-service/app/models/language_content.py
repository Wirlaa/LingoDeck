"""
LanguageContent — the Finnish wordbank.

One row = one Finnish sentence with a designated target word.
This table is the source of truth for all quest generation and card rolling.

Both quest-service and card-service read from this table.
Only quest-service seeds it (via /admin/seed).

Difficulty bands map to card rarities:
  Common     0.00-0.20  basic greetings, numbers
  Uncommon   0.21-0.40  simple verbs, common phrases
  Rare       0.41-0.60  verb conjugations, basic cases
  Epic       0.61-0.80  partitive, compound nouns
  Legendary  0.81-1.00  bureaucratic Finnish, idioms

Content types:
  noun    Concrete noun that can be represented visually (e.g. kahvia, metro)
  phrase  Functional expression, directional word, or polite formula
          (e.g. vasemmalle, Kiitos, kortilla)
  idiom   Multi-word or compound expression with non-literal / bureaucratic
          meaning (e.g. perustoimeentulotukea, tiimipelaaja, Mennään)
"""

import enum

from sqlalchemy import Boolean, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Rarity(str, enum.Enum):
    COMMON    = "Common"
    UNCOMMON  = "Uncommon"
    RARE      = "Rare"
    EPIC      = "Epic"
    LEGENDARY = "Legendary"


class ContentType(str, enum.Enum):
    NOUN   = "noun"    # concrete, picturable object
    PHRASE = "phrase"  # functional expression / word-in-context
    IDIOM  = "idiom"   # compound, bureaucratic, or figurative expression


class LanguageContent(Base):
    __tablename__ = "language_content"

    sentence_fi: Mapped[str] = mapped_column(Text, nullable=False)
    sentence_en: Mapped[str] = mapped_column(Text, nullable=False)
    target_fi: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    target_en: Mapped[str] = mapped_column(String(256), nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=0.1)
    rarity: Mapped[str] = mapped_column(String(32), nullable=False, default=Rarity.COMMON)
    scenario_tags: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    content_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ContentType.PHRASE
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<LanguageContent target='{self.target_fi}' type={self.content_type} rarity={self.rarity}>"

"""
LanguageContent — Finnish wordbank.

One row = one Finnish sentence with a target word to be blanked out.
Shared by quest-service (seeding, quest generation) and card-service
(picking words for pack openings).

Difficulty bands → card rarity:
  Common     0.00-0.20   basic greetings, numbers
  Uncommon   0.21-0.40   simple verbs, common phrases
  Rare       0.41-0.60   verb conjugations, basic cases
  Epic       0.61-0.80   partitive, compound nouns
  Legendary  0.81-1.00   bureaucratic Finnish, idioms
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


class LanguageContent(Base):
    __tablename__ = "language_content"

    sentence_fi:  Mapped[str]   = mapped_column(Text,        nullable=False)
    sentence_en:  Mapped[str]   = mapped_column(Text,        nullable=False)
    target_fi:    Mapped[str]   = mapped_column(String(256), nullable=False, index=True)
    target_en:    Mapped[str]   = mapped_column(String(256), nullable=False)
    difficulty:   Mapped[float] = mapped_column(Float,       nullable=False, default=0.1)
    rarity:       Mapped[str]   = mapped_column(String(32),  nullable=False, default=Rarity.COMMON)

    # Comma-separated scenario tags e.g. "cafe_order,kela_boss"
    scenario_tags: Mapped[str]  = mapped_column(String(256), nullable=False, default="")

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<LanguageContent target='{self.target_fi}' rarity={self.rarity}>"

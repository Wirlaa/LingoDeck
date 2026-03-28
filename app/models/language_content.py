import enum

from sqlalchemy import Boolean, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Rarity(str, enum.Enum):
    COMMON = "Common"
    UNCOMMON = "Uncommon"
    RARE = "Rare"
    EPIC = "Epic"
    LEGENDARY = "Legendary"


class LanguageContent(Base):
    """
    One row = one Finnish sentence with a designated target word.

    The challenge is built at runtime like this:
      - Take sentence_fi, replace target_fi with ___
      - Take sentence_en, replace target_en with ___
      - Show both blanked sentences to the player
      - Pull 3 other target_fi values from this table as wrong options
      - Player picks the correct target_fi from 4 choices
    """

    __tablename__ = "language_content"

    # The full Finnish sentence e.g. "Haluaisin kupillisen teetä."
    sentence_fi: Mapped[str] = mapped_column(Text, nullable=False)

    # The full English translation e.g. "I would like a cup of tea."
    sentence_en: Mapped[str] = mapped_column(Text, nullable=False)

    # The Finnish word being tested e.g. "teetä"
    target_fi: Mapped[str] = mapped_column(String(256), nullable=False, index=True)

    # The English translation of the target word e.g. "tea"
    target_en: Mapped[str] = mapped_column(String(256), nullable=False)

    # Difficulty 0.0 (easy) to 1.0 (legendary)
    difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=0.1)

    # Rarity tier based on difficulty
    rarity: Mapped[str] = mapped_column(
        String(32), nullable=False, default=Rarity.COMMON
    )

    # Tags for filtering by battle scenario e.g. "cafe_order,kela_boss"
    scenario_tags: Mapped[str] = mapped_column(
        String(256), nullable=False, default=""
    )

    # Set to False to hide a row without deleting it
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<LanguageContent target='{self.target_fi}' rarity={self.rarity}>"

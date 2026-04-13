"""
UserCard — one row per card owned by a user.

A card IS a Finnish vocabulary word at a certain star level.
Getting a duplicate doesn't add a new row — it adds XP instead
and increments duplicate_count.

XP thresholds (star → next star):
  1★ → 2★ :  10 XP    (easy — first practice)
  2★ → 3★ :  30 XP    (moderate grind)
  3★ → 4★ :  60 XP    (hard grind, real mastery)

XP sources (applied by card_service.add_xp):
  Quest correct answer  :  1 XP
  Battle correct answer :  2 XP
  Duplicate card        :  5 XP
"""
import uuid
from sqlalchemy import Float, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

STAR_XP_THRESHOLDS: dict[int, int] = {1: 10, 2: 30, 3: 60}
MAX_STAR = 4


class UserCard(Base):
    __tablename__ = "user_cards"
    __table_args__ = (
        UniqueConstraint("user_id", "word_fi", name="uq_user_word"),
    )

    user_id:        Mapped[str]   = mapped_column(String(128), nullable=False, index=True)
    word_fi:        Mapped[str]   = mapped_column(String(256), nullable=False)
    word_en:        Mapped[str]   = mapped_column(String(256), nullable=False)
    scenario:       Mapped[str]   = mapped_column(String(64),  nullable=False, index=True)
    rarity:         Mapped[str]   = mapped_column(String(32),  nullable=False, default="Common")
    difficulty:     Mapped[float] = mapped_column(Float,       nullable=False, default=0.1)
    star_level:     Mapped[int]   = mapped_column(Integer,     nullable=False, default=1)
    xp:             Mapped[int]   = mapped_column(Integer,     nullable=False, default=0)
    duplicate_count: Mapped[int]  = mapped_column(Integer,     nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<UserCard {self.word_fi} {self.star_level}★ xp={self.xp}>"

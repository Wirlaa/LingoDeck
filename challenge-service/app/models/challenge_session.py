"""
ChallengeSession and ChallengeAction models.

ChallengeSession — tracks the full state of one KELA boss fight.

  Storing everything in the DB means the service is stateless —
  any request can resume a fight exactly where it left off.

  question_queue is a JSON list of ChallengeQuestion UUIDs generated
  upfront at fight start. During the fight we just read from this list.

ChallengeAction — logs every turn.
  One row per turn — used for stats, debugging, and replays.
"""

import uuid

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ChallengeSession(Base):
    __tablename__ = "challenge_sessions"

    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    # Always "kela_boss" — other scenarios removed, KELA only
    scenario: Mapped[str] = mapped_column(String(64), nullable=False, default="kela_boss")

    # "active" | "won" | "lost" | "draw"
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    player_hp: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_hp: Mapped[int] = mapped_column(Integer, nullable=False)

    # Current turn number, starts at 1
    current_turn: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Ordered list of ChallengeQuestion UUIDs as JSON array of strings
    question_queue: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Player's deck as sent by Node.js
    # e.g. [{"card_id": "...", "rarity": "Rare", "word_fi": "tukea", "power": 20}]
    deck: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bonus_packs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return (
            f"<ChallengeSession status={self.status} "
            f"turn={self.current_turn} "
            f"player_hp={self.player_hp} ai_hp={self.ai_hp}>"
        )


class ChallengeAction(Base):
    """One turn logged per row."""
    __tablename__ = "challenge_actions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    turn: Mapped[int] = mapped_column(Integer, nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    given_answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False, default=False)
    damage_dealt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    damage_taken: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return (
            f"<ChallengeAction turn={self.turn} "
            f"correct={self.is_correct} "
            f"dealt={self.damage_dealt} taken={self.damage_taken}>"
        )

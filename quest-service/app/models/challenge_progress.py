"""
Quest challenge system — predefined milestones that reward card packs.

QuestChallenge: seeded definitions (run /admin/seed-challenges to populate).
UserChallengeProgress: per-user progress toward each challenge.

Challenge types:
  count_correct  — answer X questions correctly (optionally filtered by scenario)
  streak         — get X correct answers in a row within a session

Cooldown: a completed challenge can only be rewarded once per cooldown_hours.
After reward, progress resets to 0 for the next cycle.

Pack reward:
  The game-backend reads pack_scenario_bias from the completion response
  and calls card-service /cards/open-pack with that bias.
  bias=None means a fully random pack.
"""
import uuid
from datetime import datetime
from sqlalchemy import Float, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime
from app.models.base import Base


class QuestChallenge(Base):
    __tablename__ = "quest_challenges"

    slug:                Mapped[str]       = mapped_column(String(64),  nullable=False, unique=True)
    name:                Mapped[str]       = mapped_column(String(128), nullable=False)
    description:         Mapped[str]       = mapped_column(String(512), nullable=False)
    challenge_type:      Mapped[str]       = mapped_column(String(32),  nullable=False)  # count_correct | streak
    target_value:        Mapped[int]       = mapped_column(Integer,     nullable=False)
    scenario_filter:     Mapped[str|None]  = mapped_column(String(64),  nullable=True)   # None = any scenario
    pack_scenario_bias:  Mapped[str|None]  = mapped_column(String(64),  nullable=True)   # bias for pack reward
    cooldown_hours:      Mapped[int]       = mapped_column(Integer,     nullable=False, default=24)

    def __repr__(self) -> str:
        return f"<QuestChallenge {self.slug} type={self.challenge_type} target={self.target_value}>"


class UserChallengeProgress(Base):
    __tablename__ = "user_challenge_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge"),
    )

    user_id:          Mapped[str]            = mapped_column(String(128),        nullable=False, index=True)
    challenge_id:     Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    current_progress: Mapped[int]            = mapped_column(Integer,            nullable=False, default=0)
    times_completed:  Mapped[int]            = mapped_column(Integer,            nullable=False, default=0)
    last_rewarded_at: Mapped[datetime|None]  = mapped_column(DateTime(timezone=True), nullable=True)

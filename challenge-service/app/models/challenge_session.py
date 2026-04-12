"""
ChallengeSession v2.1 — adds pre-turn state persistence.

New fields vs v2.0:
  pre_turn_used         → True if FOCUS pre-turn was already called this turn
  pre_turn_card_id      → which support card was used in pre-turn
  pre_turn_removed_opt  → which option was removed by FOCUS
  pre_turn_turn         → which turn number the pre-turn was for (prevents reuse)
"""

import uuid
from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class ChallengeSession(Base):
    __tablename__ = "challenge_sessions"

    user_id:  Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    scenario: Mapped[str] = mapped_column(String(64),  nullable=False, default="kela_boss")
    status:   Mapped[str] = mapped_column(String(32),  nullable=False, default="active")

    battle_meter:   Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    win_threshold:  Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    lose_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=-100)
    correct_base:   Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    wrong_base:     Mapped[int] = mapped_column(Integer, nullable=False, default=-15)

    current_turn: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_turns:    Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    question_queue:     Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    deck:               Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    hand:               Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    draw_pile:          Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    discard_pile:       Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    used_support_cards: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Pre-turn state — persisted to prevent FOCUS abuse
    pre_turn_used:        Mapped[bool]       = mapped_column(Boolean, nullable=False, default=False)
    pre_turn_card_id:     Mapped[str | None] = mapped_column(String(128), nullable=True)
    pre_turn_removed_opt: Mapped[str | None] = mapped_column(String(256), nullable=True)
    pre_turn_turn:        Mapped[int]        = mapped_column(Integer, nullable=False, default=0)

    correct_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_streak:     Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    xp_earned:      Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bonus_packs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return (
            f"<ChallengeSession status={self.status} "
            f"turn={self.current_turn}/{self.max_turns} "
            f"meter={self.battle_meter}>"
        )


class ChallengeAction(Base):
    __tablename__ = "challenge_actions"

    session_id:  Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    turn:        Mapped[int]       = mapped_column(Integer, nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    given_answer:    Mapped[str]  = mapped_column(Text, nullable=False)
    is_correct:      Mapped[bool] = mapped_column(nullable=False, default=False)
    answer_card_id:  Mapped[str | None] = mapped_column(String(128), nullable=True)
    support_card_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    meter_before: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    meter_delta:  Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    meter_after:  Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    effect_result:             Mapped[dict]  = mapped_column(JSONB, nullable=False, default=dict)
    scenario_bonus_applied:    Mapped[bool]  = mapped_column(nullable=False, default=False)
    scenario_bonus_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
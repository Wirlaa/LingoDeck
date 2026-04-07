"""
ChallengeQuestion — local mirror of quest questions for a boss fight.

Why we mirror instead of calling quest-service each turn:
  Once a fight starts, we never call quest-service again.
  All questions are fetched upfront and stored here so:
    1. The fight is self-contained — quest-service can restart mid-fight
    2. No per-turn latency from HTTP calls
    3. We can store correct_answer locally for scoring

source field:
  "quest_service" → fetched from quest-service /quests/generate-internal
  "llm"           → generated directly by the KELA LLM boss
"""

import uuid

from sqlalchemy import Float, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ChallengeQuestion(Base):
    __tablename__ = "challenge_questions"

    # UUID assigned by quest-service (None for LLM-generated questions)
    external_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # "quest_service" | "llm"
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="quest_service")

    question_fi: Mapped[str] = mapped_column(Text, nullable=False)
    question_en: Mapped[str] = mapped_column(Text, nullable=False)

    # 4 lowercase options already shuffled
    options: Mapped[list] = mapped_column(ARRAY(String), nullable=False)

    # Stored locally — never sent to the player before submission
    correct_answer: Mapped[str] = mapped_column(String(256), nullable=False)

    difficulty: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:
        return (
            f"<ChallengeQuestion source={self.source} "
            f"correct='{self.correct_answer}'>"
        )

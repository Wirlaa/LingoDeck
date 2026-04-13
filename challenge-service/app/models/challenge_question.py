"""
ChallengeQuestion v2 — includes tags and deck card reference.

tags: list of content/effect tags used for combo matching
deck_card_id: which card from the player's deck this question is for
deck_word_fi: the Finnish word from that card (for debugging)
source: "llm" | "fallback"
"""

import uuid
from sqlalchemy import Float, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class ChallengeQuestion(Base):
    __tablename__ = "challenge_questions"

    external_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # "llm" | "fallback"
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="llm")

    question_fi:  Mapped[str] = mapped_column(Text, nullable=False)
    question_en:  Mapped[str] = mapped_column(Text, nullable=False)
    options:      Mapped[list] = mapped_column(ARRAY(String), nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(256), nullable=False)

    difficulty: Mapped[float] = mapped_column(Float, nullable=False)

    # Tags for effect matching (combo, scenario bonus)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Which deck card generated this question
    deck_card_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    deck_word_fi: Mapped[str | None] = mapped_column(String(256), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<ChallengeQuestion source={self.source} "
            f"correct='{self.correct_answer}' "
            f"tags={self.tags}>"
        )

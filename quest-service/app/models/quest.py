import uuid

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Quest(Base):
    """
    One generated quest instance (fill-in-the-blank).

    Built from a LanguageContent row at runtime:
      - question_fi: Finnish sentence with the target word replaced by ....
      - question_en: English sentence with the target word replaced by ....
      - options: 4 Finnish words (1 correct + 3 wrong), already shuffled
      - correct_answer: never sent to frontend before submission
    """

    __tablename__ = "quests"

    content_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    question_fi: Mapped[str] = mapped_column(Text, nullable=False)
    question_en: Mapped[str] = mapped_column(Text, nullable=False)

    options: Mapped[list] = mapped_column(ARRAY(String), nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(256), nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:
        return f"<Quest correct='{self.correct_answer}' difficulty={self.difficulty}>"


class QuestSubmission(Base):
    """Records one player answer to one quest."""

    __tablename__ = "quest_submissions"

    quest_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    given_answer: Mapped[str] = mapped_column(String(256), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pack_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    def __repr__(self) -> str:
        return f"<QuestSubmission user={self.user_id} correct={self.is_correct}>"

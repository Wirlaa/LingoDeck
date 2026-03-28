import uuid

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Challenge(Base):
    """
    One generated challenge instance.

    Built from a LanguageContent row at runtime:
      - question_fi: the Finnish sentence with the target word replaced by ___
      - question_en: the English sentence with the target word replaced by ___
      - options: 4 Finnish words (1 correct + 3 wrong), already shuffled
      - correct_answer: the correct Finnish word (never sent to the frontend)
    """

    __tablename__ = "challenges"

    # Which LanguageContent row this was built from
    content_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # The blanked Finnish sentence e.g. "Haluaisin kupillisen ___."
    question_fi: Mapped[str] = mapped_column(Text, nullable=False)

    # The blanked English sentence e.g. "I would like a cup of ___."
    question_en: Mapped[str] = mapped_column(Text, nullable=False)

    # The 4 options shown to the player e.g. ["teetä", "kahvia", "vettä", "maitoa"]
    options: Mapped[list] = mapped_column(ARRAY(String), nullable=False)

    # The correct option - never exposed to the frontend before submission
    correct_answer: Mapped[str] = mapped_column(String(256), nullable=False)

    difficulty: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:
        return f"<Challenge correct='{self.correct_answer}' difficulty={self.difficulty}>"


class ChallengeSubmission(Base):
    """
    Records one player answer to one challenge.
    """

    __tablename__ = "challenge_submissions"

    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    # user_id comes from the Node.js backend, stored as a plain string here
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    # What the player picked
    given_answer: Mapped[str] = mapped_column(String(256), nullable=False)

    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # XP earned for this submission
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Pack quality score 0.0-1.0, used to determine card rarity when a pack is awarded
    pack_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    def __repr__(self) -> str:
        return f"<ChallengeSubmission user={self.user_id} correct={self.is_correct}>"

"""Quest — one generated fill-in-the-blank question instance."""
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Float, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Quest(Base):
    __tablename__ = "quests"

    user_id:        Mapped[str]   = mapped_column(String(128), nullable=False, index=True)
    content_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    scenario:       Mapped[str]   = mapped_column(String(64),  nullable=False, default="general")
    question_fi:    Mapped[str]   = mapped_column(Text,        nullable=False)
    question_en:    Mapped[str]   = mapped_column(Text,        nullable=False)
    options:        Mapped[list]  = mapped_column(ARRAY(String), nullable=False)
    correct_answer: Mapped[str]   = mapped_column(String(256), nullable=False)
    difficulty:     Mapped[float] = mapped_column(Float,       nullable=False, default=0.1)
    target_word_fi: Mapped[str]   = mapped_column(String(256), nullable=False, default="")

    # "wordbank" | "llm" | "fallback"
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="wordbank")

    def __repr__(self) -> str:
        return f"<Quest scenario={self.scenario} difficulty={self.difficulty:.2f}>"


class QuestSubmission(Base):
    __tablename__ = "quest_submissions"

    quest_id:     Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    user_id:      Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    given_answer: Mapped[str] = mapped_column(String(256), nullable=False)
    is_correct:   Mapped[bool] = mapped_column(nullable=False, default=False)

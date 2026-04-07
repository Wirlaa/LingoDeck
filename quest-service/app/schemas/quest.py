"""
Pydantic schemas for the quest router.

QuestOut never includes correct_answer — it stays hidden until submission.
QuestResult reveals correct_answer after the player has answered.
"""

import uuid
from pydantic import BaseModel, Field


class QuestGenerateRequest(BaseModel):
    """Sent by Node.js to request a new quest."""
    user_id: str
    scenario_tag: str | None = None          # filter wordbank by scenario
    difficulty_target: float | None = None   # 0.0-1.0, pick nearest available


class QuestOut(BaseModel):
    """
    Returned to the player via Node.js after generating a quest.
    correct_answer is deliberately excluded — never expose it here.
    """
    id: uuid.UUID
    question_fi: str    # e.g. "Haluaisin kupillisen ...., kiitos."
    question_en: str    # e.g. "I would like a cup of ...., please."
    options: list[str]  # 4 lowercase options already shuffled
    difficulty: float
    source: str         # "wordbank" | "llm" — useful for debugging

    model_config = {"from_attributes": True}


class QuestSubmitRequest(BaseModel):
    """Sent by Node.js when the player picks an answer."""
    quest_id: uuid.UUID
    user_id: str
    given_answer: str   # must be one of the 4 options


class QuestResult(BaseModel):
    """Returned after scoring the player's answer."""
    quest_id: uuid.UUID
    correct_answer: str  # now revealed
    given_answer: str
    is_correct: bool
    feedback: str        # "Correct!" or "The answer was kahvia."
    xp_earned: int
    pack_score: float = Field(ge=0.0, le=1.0)
    pack_awarded: bool   # True if pack_score >= 0.5

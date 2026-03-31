import uuid

from pydantic import BaseModel, Field


class QuestGenerateRequest(BaseModel):
    """Sent by Node.js to request a new quest."""
    user_id: str
    scenario_tag: str | None = None
    difficulty_target: float | None = None


class QuestOut(BaseModel):
    """
    Returned after generating a quest.
    correct_answer is NOT included — never expose it before submission.
    """
    id: uuid.UUID
    question_fi: str
    question_en: str
    options: list[str]
    difficulty: float

    model_config = {"from_attributes": True}


class QuestSubmitRequest(BaseModel):
    """Sent by Node.js when the player picks an answer."""
    quest_id: uuid.UUID
    user_id: str
    given_answer: str


class QuestResult(BaseModel):
    """Returned after scoring the player's answer."""
    quest_id: uuid.UUID
    correct_answer: str
    given_answer: str
    is_correct: bool
    feedback: str
    xp_earned: int
    pack_score: float = Field(ge=0.0, le=1.0)
    pack_awarded: bool

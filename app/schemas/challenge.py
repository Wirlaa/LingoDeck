import uuid

from pydantic import BaseModel, Field


class ChallengeGenerateRequest(BaseModel):
    """
    Sent by Node.js to request a new challenge.
    All fields are optional - if nothing is specified we just pick a random sentence.
    """
    user_id: str
    scenario_tag: str | None = None         # filter by scenario e.g. "cafe_order"
    difficulty_target: float | None = None  # 0.0-1.0, picks nearest available


class ChallengeOut(BaseModel):
    """
    Returned to Node.js after generating a challenge.
    Note: correct_answer is NOT included here - never expose it before submission.
    """
    id: uuid.UUID
    question_fi: str   # Finnish sentence with ---- e.g. "Haluaisin kupillisen ----"
    question_en: str   # English sentence with ----e.g. "I would like a cup of ----"
    options: list[str] # 4 options already shuffled e.g. ["kahvia", "teetä", "vettä", "maitoa"]
    difficulty: float

    model_config = {"from_attributes": True}


class ChallengeSubmitRequest(BaseModel):
    """Sent by Node.js when the player picks an answer."""
    challenge_id: uuid.UUID
    user_id: str
    given_answer: str  # one of the 4 options the player clicked


class SubmissionResult(BaseModel):
    """Returned after scoring the player's answer."""
    challenge_id: uuid.UUID
    correct_answer: str  # now we reveal it
    given_answer: str
    is_correct: bool
    feedback: str        # short message e.g. "Correct!" or "The answer was kahvia."
    xp_earned: int
    pack_score: float = Field(ge=0.0, le=1.0)
    pack_awarded: bool   # True if pack_score is high enough to award a pack

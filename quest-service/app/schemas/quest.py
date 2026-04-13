from pydantic import BaseModel


class QuestGenerateRequest(BaseModel):
    user_id: str
    scenario_tag: str | None = None
    difficulty_target: float | None = None


class QuestSubmitRequest(BaseModel):
    user_id: str
    quest_id: str
    given_answer: str
    # Current streak passed in from game-backend (it tracks this across submissions)
    current_streak: int = 0


class QuestResponse(BaseModel):
    quest_id: str
    question_fi: str
    question_en: str
    options: list[str]
    difficulty: float
    scenario: str
    target_word_fi: str

    model_config = {"from_attributes": True}


class QuestResultResponse(BaseModel):
    quest_id: str
    is_correct: bool
    correct_answer: str
    given_answer: str
    xp_earned: int           # XP to apply to the card (1 if correct, 0 if wrong)
    target_word_fi: str      # word to add XP to in card-service
    scenario: str

    # Challenge updates — game-backend reads these and opens packs if needed
    completed_challenges: list[dict]

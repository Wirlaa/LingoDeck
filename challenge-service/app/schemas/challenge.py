"""Challenge schemas — battle start, action, state output."""
import uuid
from pydantic import BaseModel, Field


class ChallengeStartRequest(BaseModel):
    """Start a battle. Deck is fetched from card-service — only user_id and scenario needed."""
    user_id:  str
    scenario: str


class ChallengeActionRequest(BaseModel):
    question_id:     uuid.UUID
    answer_card_id:  str
    given_answer:    str
    support_card_id: str | None = None  # reserved for future card effects


class QuestionOut(BaseModel):
    id:          str
    question_fi: str
    question_en: str
    options:     list[str]
    difficulty:  float
    tags:        list[str]
    deck_card_id: str | None
    source:      str


class LastActionOut(BaseModel):
    turn:           int
    question_id:    str
    given_answer:   str
    correct_answer: str
    is_correct:     bool
    feedback:       str
    answer_card_id: str
    meter_before:   int
    meter_delta:    int
    meter_after:    int
    combo_triggered: bool
    combo_multiplier: float
    star_level:     int
    ai_flavour:     str | None


class ChallengeStateOut(BaseModel):
    session_id:    uuid.UUID
    scenario:      str
    status:        str        # active | won | lost | draw

    battle_meter:  int
    win_threshold: int
    lose_threshold: int
    meter_percent: float      # 0.0-1.0 for frontend progress bar

    current_turn:  int
    max_turns:     int
    hand:          list[dict]

    next_question: QuestionOut | None = None
    last_action:   LastActionOut | None = None
    ai_flavour:    str | None = None

    correct_streak: int = 0
    max_streak:     int = 0
    xp_earned:      int
    bonus_packs:    int

    # Correctly-answered word_fi values — game-backend uses these to grant card XP
    correct_words_this_turn: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PreTurnResponse(BaseModel):
    """Pre-turn response. Card effects are not implemented — always returns no-effect."""
    question_id:       str
    original_options:  list[str]
    modified_options:  list[str]
    removed_option:    str | None = None
    effect_description: str = "Card effects coming in a future update."

"""
Challenge schemas v2.

Key changes from v1:
  - DeckCard now includes effect_type, tags, effect_strength
  - ChallengeActionRequest uses answer_card_id + support_card_id instead of just given_answer
    (given_answer kept for validation/debugging)
  - ChallengeStateOut returns full battle meter info, hand, effect result
  - New PreTurnResponse for FOCUS effect (removes option before player answers)
"""

import uuid
from pydantic import BaseModel, Field


class DeckCard(BaseModel):
    """One card in the player's deck — enriched with effect info."""
    card_id: str
    rarity: str
    word_fi: str
    power: int

    # Effect system — assigned by session_store if not provided
    effect_type: str = "none"
    tags: list[str] = Field(default_factory=list)
    effect_strength: float = 1.0

    # Optional: scenario bonus hint from Node.js
    scenario_bonus: float = 1.0


class ChallengeStartRequest(BaseModel):
    user_id: str
    deck: list[DeckCard] = Field(min_length=1)
    scenario: str = "kela_boss"


class ChallengeActionRequest(BaseModel):
    """
    Player submits their answer for the current turn.

    answer_card_id: the card being played as the answer token
    support_card_id: optional support card for its effect
    given_answer: the selected text answer (one of the 4 options)
    question_id: which question this is for
    """
    question_id: uuid.UUID
    answer_card_id: str
    given_answer: str
    support_card_id: str | None = None


class EffectResultOut(BaseModel):
    """Serialisable view of an effect result."""
    effect_type: str
    effect_triggered: bool
    description: str
    removed_option: str | None = None
    meter_delta_modifier: int = 0
    shield_absorbed: int = 0
    retry_available: bool = False


class LastActionOut(BaseModel):
    """Summary of the last turn's action."""
    turn: int
    question_id: str
    given_answer: str
    correct_answer: str
    is_correct: bool
    feedback: str

    answer_card_id: str
    support_card_id: str | None

    meter_before: int
    meter_delta: int
    meter_after: int

    scenario_bonus_applied: bool
    scenario_bonus_multiplier: float

    effect_result: EffectResultOut
    ai_flavour: str | None


class QuestionOut(BaseModel):
    """A question shown to the player. Never includes correct_answer."""
    id: str
    question_fi: str
    question_en: str
    options: list[str]  # 4 lowercase options, possibly reduced by FOCUS
    difficulty: float
    tags: list[str]
    deck_card_id: str | None
    source: str


class ChallengeStateOut(BaseModel):
    """
    Full battle state. Returned after /start, /action, and GET /{id}.

    Contains everything the frontend needs to render the fight:
      - battle meter position and thresholds
      - current hand
      - next question (without correct_answer)
      - last action summary
      - ai flavour text
    """
    session_id: uuid.UUID
    scenario: str
    status: str        # "active" | "won" | "lost" | "draw"

    # Battle meter
    battle_meter: int
    win_threshold: int
    lose_threshold: int
    meter_percent: float  # 0.0-1.0 for frontend progress bar

    # Turn tracking
    current_turn: int
    max_turns: int

    # Cards
    hand: list[dict]

    # Next question (None when fight is over)
    next_question: QuestionOut | None = None

    # Last action summary (None on first request)
    last_action: LastActionOut | None = None

    # Flavour text
    ai_flavour: str | None = None

    # Rewards
    correct_streak: int = 0
    max_streak: int = 0
    xp_earned: int
    bonus_packs: int

    model_config = {"from_attributes": True}


class PreTurnResponse(BaseModel):
    """
    Returned when a FOCUS support card is played before the player answers.
    Contains the modified options list with one wrong answer removed.
    """
    question_id: str
    original_options: list[str]
    modified_options: list[str]
    removed_option: str | None
    effect_description: str
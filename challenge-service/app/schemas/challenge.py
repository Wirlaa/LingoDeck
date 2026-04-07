"""
Pydantic schemas for the challenge (KELA boss fight) router.

DeckCard — one card sent by Node.js when starting a fight.
ChallengeStartRequest — start a new KELA boss fight.
ChallengeActionRequest — player submits an answer for the current turn.
ChallengeStateOut — full fight state returned after every action.
"""

import uuid
from pydantic import BaseModel, Field


class DeckCard(BaseModel):
    """One card in the player's deck."""
    card_id: str
    rarity: str
    word_fi: str   # Finnish word on the card — used by KELA LLM to generate questions
    power: int     # damage dealt on a correct answer


class ChallengeStartRequest(BaseModel):
    user_id: str
    deck: list[DeckCard] = Field(min_length=1)
    # scenario is always kela_boss — field kept for forward compatibility
    scenario: str = "kela_boss"


class ChallengeActionRequest(BaseModel):
    """Player picks an answer for the current turn."""
    question_id: uuid.UUID
    given_answer: str   # must be one of the 4 lowercase options


class ChallengeStateOut(BaseModel):
    """
    Returned after every action and on GET /challenges/{session_id}.
    Contains everything the frontend needs to render the fight.
    """
    session_id: uuid.UUID
    scenario: str
    status: str        # "active" | "won" | "lost" | "draw"
    player_hp: int
    ai_hp: int
    current_turn: int
    max_turns: int

    # Next question to show the player. None when the fight is over.
    next_question: dict | None = None

    # Summary of the last action. None on the first request (fight just started).
    last_action: dict | None = None

    # Flavour text from KELA after a wrong answer, or victory/defeat text.
    ai_flavour: str | None = None

    xp_earned: int
    bonus_packs: int   # how many packs Node.js should open via card-service on victory

    model_config = {"from_attributes": True}

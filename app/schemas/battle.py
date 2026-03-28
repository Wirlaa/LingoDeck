import uuid

from pydantic import BaseModel, Field


class DeckCard(BaseModel):
    """One card in the player's deck as sent by Node.js when starting a battle."""
    card_id: str    # CardDefinition ID from the Node.js DB
    rarity: str
    word_fi: str    # used by the LLM boss to know what the card tests
    power: int      # damage this card deals on a correct answer


class BattleStartRequest(BaseModel):
    user_id: str
    scenario: str
    deck: list[DeckCard] = Field(min_length=1)


class BattleActionRequest(BaseModel):
    """Sent by Node.js when the player picks an answer during a battle."""
    challenge_id: uuid.UUID
    given_answer: str


class BattleStateOut(BaseModel):
    """
    Returned after every battle action and on GET /battles/{session_id}.
    Gives the frontend everything it needs to render the current state.
    """
    session_id: uuid.UUID
    scenario: str
    status: str          # "active", "won", "lost", "draw"
    player_hp: int
    ai_hp: int
    current_turn: int
    max_turns: int

    # The next challenge to show the player.
    # None when the battle is over.
    next_challenge: dict | None = None

    # Summary of the last action taken.
    # None on the first request (battle just started).
    last_action: dict | None = None

    # Flavour text from the AI opponent after a wrong answer.
    ai_flavour: str | None = None

    xp_earned: int
    bonus_packs: int

    model_config = {"from_attributes": True}

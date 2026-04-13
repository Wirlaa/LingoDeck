from pydantic import BaseModel


class PackOpenRequest(BaseModel):
    user_id: str
    scenario_bias: str | None = None


class CardXpRequest(BaseModel):
    user_id: str
    word_fi: str
    xp: int


class ScenarioUnlockRequest(BaseModel):
    user_id: str
    beaten_scenario: str


class BattleDeckResponse(BaseModel):
    eligible: bool
    deck: list[dict]
    card_count: int
    reason: str | None

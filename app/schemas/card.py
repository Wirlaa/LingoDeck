import uuid

from pydantic import BaseModel, Field


class CardOut(BaseModel):
    """
    Represents one card returned from a pack opening.
    Node.js receives this and persists it in its own DB as part of the user's inventory.
    """
    content_id: uuid.UUID  # the LanguageContent row this card was built from
    sentence_fi: str
    sentence_en: str
    target_fi: str
    target_en: str
    rarity: str
    difficulty: float
    power: int             # used in battle damage calculation

    model_config = {"from_attributes": True}


class PackOpenRequest(BaseModel):
    """Sent by Node.js to open a pack after a successful challenge submission."""
    user_id: str
    pack_score: float = Field(ge=0.0, le=1.0)  # from the submission result
    scenario_tags: list[str] | None = None      # optional: bias cards toward a scenario


class PackOpenResult(BaseModel):
    """Returned after opening a pack."""
    pack_score: float
    cards: list[CardOut]
    legendary_pulled: bool  # True if any card in the pack is Legendary

"""
Card schemas.

CardOut — one card returned from a pack opening.
  Node.js receives these and saves them to the user's inventory.
  This service generates them but does NOT persist them.

  content_type drives the frontend card layout:
    noun   → image emoji + word + sentence + translation
    phrase → usage context + word + meaning
    idiom  → literal meaning → actual meaning + example

PackOpenRequest — sent by Node.js after a successful quest submission.
PackOpenResult  — returned to Node.js with the rolled cards.
"""

import uuid
from pydantic import BaseModel, Field


class CardOut(BaseModel):
    content_id: uuid.UUID   # LanguageContent row this card was built from
    sentence_fi: str
    sentence_en: str
    target_fi: str
    target_en: str
    rarity: str
    difficulty: float
    power: int              # damage value in boss fights
    content_type: str       # "noun" | "phrase" | "idiom"


class PackOpenRequest(BaseModel):
    user_id: str
    pack_score: float = Field(ge=0.0, le=1.0)  # from QuestResult
    scenario_tags: list[str] | None = None     # bias cards toward a scenario


class PackOpenResult(BaseModel):
    pack_score: float
    cards: list[CardOut]
    legendary_pulled: bool   # True if any card is Legendary — frontend can show special animation

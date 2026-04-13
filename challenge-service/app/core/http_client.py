"""
HTTP clients for inter-service calls.

fetch_quest_question()   → POST quest-service /quests/generate-internal
fetch_battle_deck()      → GET  card-service  /cards/battle-ready/{user_id}/{scenario}

Both are called by session_store when starting a battle.
After start, NO external calls are made — the fight is self-contained.
"""
import httpx
from app.core.config import get_settings

settings = get_settings()


async def fetch_quest_question(
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
) -> dict:
    """
    Fetch one quest question from quest-service (includes correct_answer).
    Used to populate the question queue at fight start.
    """
    payload: dict = {"user_id": "challenge-service"}
    if scenario_tag:
        payload["scenario_tag"] = scenario_tag
    if difficulty_target is not None:
        payload["difficulty_target"] = difficulty_target

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{settings.QUEST_SERVICE_URL}/quests/generate-internal",
            json=payload,
            headers={"x-service-secret": settings.QUEST_SERVICE_SECRET},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_battle_deck(user_id: str, scenario: str) -> dict:
    """
    Get battle-eligible deck from card-service.
    Returns { eligible, deck, card_count, reason }.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{settings.CARD_SERVICE_URL}/cards/battle-ready/{user_id}/{scenario}",
        )
        resp.raise_for_status()
        return resp.json()

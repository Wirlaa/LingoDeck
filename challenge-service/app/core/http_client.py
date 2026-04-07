"""
HTTP client for calling quest-service.

Challenge-service calls /quests/generate-internal at fight start to
fetch questions for the queue. The internal endpoint returns correct_answer
so we can score answers locally without calling back mid-fight.

We use the service-to-service secret (x-service-secret header) to
authenticate these calls — this endpoint is never exposed to players.
"""

import httpx

from app.core.config import get_settings

settings = get_settings()


async def fetch_quest_question(
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
) -> dict:
    """
    Call POST /quests/generate-internal on quest-service.

    Returns full question dict including correct_answer:
      {
        "id": "uuid",
        "question_fi": "...",
        "question_en": "...",
        "options": ["a", "b", "c", "d"],   # already lowercase
        "correct_answer": "kahvia",
        "difficulty": 0.1,
        "source": "wordbank"
      }

    Raises httpx.HTTPStatusError on non-2xx.
    Raises httpx.ConnectError if quest-service is unreachable.
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

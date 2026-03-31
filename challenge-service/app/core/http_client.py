"""
HTTP client for inter-service communication.

Challenge Service calls the Quest Service to fetch questions
for boss fight question queues. This module provides a thin async
wrapper around httpx so challenge_service and llm_boss don't
deal with raw HTTP directly.
"""

import httpx

from app.core.config import get_settings

settings = get_settings()


async def fetch_quest_question(
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
) -> dict:
    """
    Call POST /quests/generate-internal on the Quest Service.

    Returns the full question dict including correct_answer:
      {
        "id": "uuid",
        "question_fi": "...",
        "question_en": "...",
        "options": ["a", "b", "c", "d"],
        "correct_answer": "kahvia",
        "difficulty": 0.45,
      }

    Uses the internal endpoint (protected by x-service-secret) so
    correct_answer is available for local storage in ChallengeQuestion rows.

    Raises httpx.HTTPStatusError on non-2xx response.
    Raises httpx.ConnectError if Quest Service is unreachable.
    """
    payload: dict = {"user_id": "challenge"}
    if scenario_tag:
        payload["scenario_tag"] = scenario_tag
    if difficulty_target is not None:
        payload["difficulty_target"] = difficulty_target

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{settings.QUEST_SERVICE_URL}/quests/generate-internal",
            json=payload,
            headers={"x-service-secret": settings.QUEST_SERVICE_SECRET},
        )
        resp.raise_for_status()
        return resp.json()

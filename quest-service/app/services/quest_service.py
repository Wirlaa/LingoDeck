"""
Quest service — SKELETON.

Business logic for generating and scoring quests.
All functions are called by the quests router.

TODO: implement each function below.
The logic already exists in the original python-service — port it here,
renaming Challenge → Quest and challenge → quest throughout.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quest import Quest

# Pack is awarded when pack_score is at or above this threshold
PACK_AWARD_THRESHOLD = 0.50


async def generate_quest(
    db: AsyncSession,
    user_id: str,
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
) -> Quest:
    """
    Generate one fill-in-the-blank quest.

    Steps:
      1. Pick a LanguageContent row (see _pick_content below)
      2. Blank out target_fi in sentence_fi and target_en in sentence_en
      3. Pull 3 distractor target_fi values from other rows
      4. Shuffle all 4 options
      5. Persist the Quest row and return it

    Raises ValueError if no content is found.

    TODO: port from original challenge_service.generate_challenge, rename Challenge → Quest
    """
    raise NotImplementedError


def score_answer(
    correct_answer: str,
    given_answer: str,
) -> tuple[bool, str, int, float]:
    """
    Score a multiple choice answer.

    Returns (is_correct, feedback, xp_earned, pack_score).

    TODO: port from original challenge_service.score_answer
    """
    raise NotImplementedError


# ── Private helpers ────────────────────────────────────────────────────────────

async def _pick_content(
    db: AsyncSession,
    scenario_tag: str | None,
    difficulty_target: float | None,
):
    """
    Pick one active LanguageContent row.

    If difficulty_target is given, fetch the 5 nearest rows and pick randomly.
    If scenario_tag is given, filter by it.
    Otherwise, pick a completely random active row.

    TODO: port from original challenge_service._pick_content
    """
    raise NotImplementedError


def _blank_sentence(content) -> tuple[str, str]:
    """
    Replace target_fi in sentence_fi with .... and target_en in sentence_en with ....

    e.g.
      sentence_fi: "Haluaisin kupillisen kahvia, kiitos."
      target_fi:   "kahvia"
      result:      "Haluaisin kupillisen ...., kiitos."

    TODO: port from original challenge_service._blank_sentence
    """
    raise NotImplementedError


async def _build_options(db: AsyncSession, content) -> list[str]:
    """
    Pull 3 distractor target_fi values from other rows, shuffle with correct answer.

    If DB is too small to find 3 distractors, pad with hardcoded Finnish filler words.

    TODO: port from original challenge_service._build_options
    """
    raise NotImplementedError


def _compute_xp(is_correct: bool) -> int:
    """Returns 10 XP for correct, 2 XP for trying."""
    raise NotImplementedError


def _compute_pack_score(is_correct: bool) -> float:
    """
    Correct answer → random float in [0.50, 1.00] (always awards a pack)
    Wrong answer   → random float in [0.00, 0.40] (never awards a pack)
    """
    raise NotImplementedError

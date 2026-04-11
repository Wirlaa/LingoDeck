"""
Quest service — SKELETON.

Implement all functions marked with raise NotImplementedError.
The full implementation is in the full/ version for reference.

Two-tier quest generation:
  Tier 1 — wordbank (should be the default, fastest path)
  Tier 2 — LLM fallback via llm_client.py (when wordbank has no match)

Scoring:
  Exact string match, case-insensitive.
  Correct → pack_score 0.5-1.0 (pack awarded)
  Wrong   → pack_score 0.0-0.4 (no pack)

IMPORTANT: all options returned to the player must be lowercase.
"""

import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import func

from app.models.language_content import LanguageContent
from app.models.quest import Quest, QuestSubmission

PACK_AWARD_THRESHOLD = 0.50


async def generate_quest(
    db: AsyncSession,
    user_id: str,
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
    use_llm: bool = False,
) -> Quest:
    """
    Generate one fill-in-the-blank quest.

    TODO:
      1. If use_llm=False, call _pick_content() to get a LanguageContent row
      2. If a row is found, call _build_from_wordbank()
      3. If no row found OR use_llm=True, call _build_from_llm()
      4. Return the Quest

    Hint: all options must be lowercase (use .lower() when building options).
    """
    raise NotImplementedError


async def score_answer(
    db: AsyncSession,
    quest_id: uuid.UUID,
    user_id: str,
    given_answer: str,
) -> tuple[Quest, QuestSubmission]:
    """
    Score a player's answer and persist the submission.

    TODO:
      1. Fetch the Quest row by quest_id (raise ValueError if not found)
      2. Compare quest.correct_answer.lower() == given_answer.lower()
      3. Compute xp and pack_score using _compute_xp() and _compute_pack_score()
      4. Create and add a QuestSubmission row
      5. Return (quest, submission)
    """
    raise NotImplementedError


# ── Private helpers — implement these ─────────────────────────────────────────

async def _pick_content(
    db: AsyncSession,
    scenario_tag: str | None,
    difficulty_target: float | None,
) -> LanguageContent | None:
    """
    Pick one active LanguageContent row matching the filters.
    Return None if nothing matches (triggers LLM fallback).

    TODO:
      - If difficulty_target: fetch 5 nearest rows, pick randomly
      - If scenario_tag: filter by scenario_tags.contains(tag)
      - Otherwise: random active row
    """
    raise NotImplementedError


async def _build_from_wordbank(db: AsyncSession, content: LanguageContent) -> Quest:
    """
    Build a Quest from a LanguageContent row.

    TODO:
      1. Replace target_fi in sentence_fi with .... → question_fi
      2. Replace target_en in sentence_en with .... → question_en
      3. Call _build_options() to get 4 lowercase shuffled options
      4. Persist and return Quest with source="wordbank"
    """
    raise NotImplementedError


async def _build_from_llm(
    db: AsyncSession,
    scenario: str,
    difficulty: float,
) -> Quest:
    """
    Generate a Quest using the LLM fallback.

    TODO:
      1. Pick a random word from language_content to seed the LLM prompt
      2. Call llm_client.generate_quest_json(prompt, system)
      3. Validate: target_fi must appear in sentence_fi
      4. Lowercase all options
      5. Persist and return Quest with source="llm"
      6. Retry up to 3 times on failure
    """
    raise NotImplementedError


async def _build_options(db: AsyncSession, content: LanguageContent) -> list[str]:
    """
    Pull 3 distractor target_fi values, shuffle with correct answer.
    All options must be lowercase.

    TODO:
      - Query 3 random target_fi values (exclude current content row)
      - Pad with ["kahvia","vettä","teetä",...] if DB is too small
      - Combine with content.target_fi.lower()
      - Shuffle and return
    """
    raise NotImplementedError


def _compute_xp(is_correct: bool) -> int:
    """Return 10 XP for correct, 2 XP for trying."""
    raise NotImplementedError


def _compute_pack_score(is_correct: bool) -> float:
    """
    Correct: random float in [0.50, 1.00]
    Wrong:   random float in [0.00, 0.40]
    """
    raise NotImplementedError

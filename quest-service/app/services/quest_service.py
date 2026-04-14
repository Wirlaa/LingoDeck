"""
Quest service — core business logic.

Quest generation uses a two-tier approach:

  TIER 1 — Wordbank (default, instant)
    Picks a sentence from language_content, blanks the target word,
    pulls 3 distractors from other rows. Zero LLM cost.
    Used for ~95% of normal gameplay.

  TIER 2 — LLM fallback (when wordbank has no good match)
    Triggered when:
      - No wordbank content matches the requested scenario_tag
      - The caller explicitly passes use_llm=True
    Uses llm_client.py to call either Anthropic or Ollama depending on config.
    Takes 1-5 seconds but generates fresh, context-aware content.

Scoring:
  Exact string match (case-insensitive) against the stored correct_answer.
  Multiple choice means fuzzy matching is unnecessary — the options shown
  are the exact strings from the DB, so the player can only submit one of them.

Pack scores:
  Correct → random float 0.5-1.0 (above threshold → pack awarded)
  Wrong   → random float 0.0-0.4 (below threshold → no pack)
  Threshold: PACK_AWARD_THRESHOLD = 0.5
"""

import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import func

from app.models.language_content import LanguageContent
from app.models.quest import Quest, QuestSubmission
from app.services import llm_client

# Player must score >= this to earn a card pack
PACK_AWARD_THRESHOLD = 0.50

# Prompt templates for LLM fallback
_LLM_SYSTEM = (
    "You are a Finnish language learning content generator. "
    "Respond with valid JSON only. No markdown, no explanation."
)

_LLM_PROMPT = """Generate a Finnish fill-in-the-blank exercise.
Use the word "{word}" in a sentence about: {scenario}.
Difficulty: {difficulty} (0.0=easy, 1.0=hard)

IMPORTANT: "target_fi" must appear exactly in "sentence_fi".

Return ONLY this JSON:
{{
  "sentence_fi": "Finnish sentence containing {word}",
  "sentence_en": "English translation",
  "target_fi": "{word}",
  "target_en": "English meaning of {word}",
  "distractor_1_fi": "wrong Finnish word 1",
  "distractor_2_fi": "wrong Finnish word 2",
  "distractor_3_fi": "wrong Finnish word 3"
}}"""


async def generate_quest(
    db: AsyncSession,
    user_id: str,
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
    use_llm: bool = False,
) -> Quest:
    """
    Generate one fill-in-the-blank quest.

    Tries the wordbank first. Falls back to LLM if:
      - No wordbank content matches the filters
      - use_llm=True is explicitly passed

    Returns a persisted Quest row (correct_answer is stored but never returned to the player).
    """
    # Try wordbank first unless LLM is explicitly requested
    if not use_llm:
        content = await _pick_content(db, scenario_tag, difficulty_target)
        if content:
            return await _build_from_wordbank(db, content, user_id)

    # Fallback: LLM generation
    return await _build_from_llm(db, scenario_tag or "general", difficulty_target or 0.3)


async def score_answer(
    db: AsyncSession,
    quest_id: uuid.UUID,
    user_id: str,
    given_answer: str,
) -> tuple[Quest, QuestSubmission]:
    """
    Score a player's answer and persist the submission.

    Returns (quest, submission) so the router can build QuestResult.
    Raises ValueError if the quest does not exist.
    """
    result = await db.execute(select(Quest).where(Quest.id == quest_id))
    quest = result.scalar_one_or_none()
    if quest is None:
        raise ValueError(f"Quest {quest_id} not found")

    is_correct = quest.correct_answer.strip().lower() == given_answer.strip().lower()
    xp = _compute_xp(is_correct)
    pack_score = _compute_pack_score(is_correct)

    submission = QuestSubmission(
        id=uuid.uuid4(),
        quest_id=quest_id,
        user_id=user_id,
        given_answer=given_answer,
        is_correct=is_correct,
        xp_earned=xp,
        pack_score=pack_score,
    )
    db.add(submission)
    return quest, submission


# ── Private helpers ────────────────────────────────────────────────────────────

async def _pick_content(
    db: AsyncSession,
    scenario_tag: str | None,
    difficulty_target: float | None,
) -> LanguageContent | None:
    """Pick one LanguageContent row, return None if nothing matches."""
    query = select(LanguageContent).where(LanguageContent.is_active.is_(True))

    if scenario_tag:
        query = query.where(LanguageContent.scenario_tags.contains(scenario_tag))

    if difficulty_target is not None:
        # Pick the 5 rows nearest to the target difficulty, then choose randomly
        # This gives variety while staying close to the requested difficulty
        query = query.order_by(
            func.abs(LanguageContent.difficulty - difficulty_target)
        ).limit(5)
        result = await db.execute(query)
        rows = result.scalars().all()
        return random.choice(rows) if rows else None

    query = query.order_by(func.random()).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _build_from_wordbank(db, content, user_id: str = "", scenario_tag:str = ""):
    """Build and persist a Quest from a LanguageContent row."""
    question_fi = content.sentence_fi.replace(content.target_fi, "....", 1)
    question_en = content.sentence_en.replace(content.target_en, "....", 1)
    options = await _build_options(db, content)

    quest = Quest(
        user_id=user_id,
        content_id=content.id,
        source="wordbank",
        question_fi=question_fi,
        question_en=question_en,
        options=options,
        correct_answer=content.target_fi.lower(),
        difficulty=content.difficulty,
	scenario=scenario_tag or "general",
	target_word_fi=content.target_fi
    )
    db.add(quest)
    await db.flush()
    return quest


async def _build_from_llm(
    db: AsyncSession,
    scenario: str,
    difficulty: float,
) -> Quest:
    """Generate a Quest using the LLM fallback. Validates output before persisting."""
    # For LLM fallback we need a target word — pick one from the wordbank
    # even if scenario doesn't match, just to seed the generation
    result = await db.execute(
        select(LanguageContent.target_fi)
        .where(LanguageContent.is_active.is_(True))
        .order_by(func.random())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    word = row if row else "kahvia"

    prompt = _LLM_PROMPT.format(word=word, scenario=scenario, difficulty=difficulty)

    for attempt in range(3):
        try:
            raw = await llm_client.generate_quest_json(prompt, _LLM_SYSTEM)

            target_fi = raw["target_fi"]
            sentence_fi = raw["sentence_fi"]

            # Validate that target actually appears in sentence
            if target_fi.lower() not in sentence_fi.lower():
                continue

            question_fi = sentence_fi.replace(target_fi, "....", 1)
            question_en = raw["sentence_en"].replace(raw["target_en"], "....", 1)

            # All options lowercase and shuffled
            options = [
                target_fi.lower(),
                raw["distractor_1_fi"].lower(),
                raw["distractor_2_fi"].lower(),
                raw["distractor_3_fi"].lower(),
            ]
            random.shuffle(options)

            quest = Quest(
                id=uuid.uuid4(),
                content_id=None,   # no wordbank row backing this
                source="llm",
                question_fi=question_fi,
                question_en=question_en,
                options=options,
                correct_answer=target_fi.lower(),
                difficulty=difficulty,
            )
            db.add(quest)
            await db.flush()
            return quest

        except Exception as e:
            if attempt == 2:
                raise RuntimeError(
                    f"LLM quest generation failed after 3 attempts: {e}"
                ) from e

    raise RuntimeError("LLM quest generation failed")


async def _build_options(db: AsyncSession, content: LanguageContent) -> list[str]:
    """
    Pull 3 distractor target_fi values and shuffle with the correct answer.
    All options are lowercased for consistency.
    Falls back to hardcoded Finnish fillers if the DB is too small.
    """
    result = await db.execute(
        select(LanguageContent.target_fi)
        .where(
            LanguageContent.is_active.is_(True),
            LanguageContent.id != content.id,
            LanguageContent.target_fi != content.target_fi,
        )
        .order_by(func.random())
        .limit(3)
    )
    distractors = [r.lower() for r in result.scalars().all()]

    # Pad with common Finnish words if not enough distractors
    fillers = ["kahvia", "vettä", "teetä", "maitoa", "ruokaa", "leipää"]
    while len(distractors) < 3:
        f = random.choice(fillers).lower()
        if f not in distractors and f != content.target_fi.lower():
            distractors.append(f)

    options = distractors + [content.target_fi.lower()]
    random.shuffle(options)
    return options


def _compute_xp(is_correct: bool) -> int:
    """10 XP for correct, 2 XP for trying."""
    return 10 if is_correct else 2


def _compute_pack_score(is_correct: bool) -> float:
    """
    Pack score determines card rarity when a pack is awarded.
    Correct: 0.5-1.0 (always above threshold → pack awarded)
    Wrong:   0.0-0.4 (always below threshold → no pack)
    """
    if is_correct:
        return round(random.uniform(0.50, 1.00), 4)
    return round(random.uniform(0.00, 0.40), 4)


# ── Score quest — added for challenge tracker integration ──────────────────────

async def score_quest(db, quest_id: str, given_answer: str) -> dict:
    """Score a submitted quest answer. Raises ValueError if quest not found."""
    import uuid as _uuid
    from sqlalchemy import select
    from app.models.quest import Quest

    try:
        qid = _uuid.UUID(quest_id)
    except ValueError:
        raise ValueError(f"Invalid quest_id: {quest_id}")

    result = await db.execute(select(Quest).where(Quest.id == qid))
    quest = result.scalar_one_or_none()
    if quest is None:
        raise ValueError(f"Quest {quest_id} not found.")

    is_correct = quest.correct_answer.strip().lower() == given_answer.strip().lower()
    return {
        "quest_id":      quest_id,
        "is_correct":    is_correct,
        "correct_answer": quest.correct_answer,
        "given_answer":  given_answer,
        "xp_earned":     1 if is_correct else 0,
        "target_word_fi": quest.target_word_fi,
        "scenario":      quest.scenario,
    }

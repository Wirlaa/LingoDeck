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
    content = None
    print(f"llm_use={use_llm} scenario_tag={scenario_tag} difficulty_target={difficulty_target}")
    # 1. Try DB content if not forcing LLM
    if use_llm is False:
        content = await _pick_content(
            db=db,
            user_id=user_id,
            scenario_tag=scenario_tag,
            difficulty_target=difficulty_target,
        )

    # 2. If content found → build from wordbank
    if content is not None:
        quest = await _build_from_wordbank(db, content)

    # 3. Otherwise → fallback to LLM
    else:
        quest = await _build_from_llm(
            db=db,
            scenario=scenario_tag or "general",
            difficulty=difficulty_target or 0.5,
        )

    # 4. Ensure all options are lowercase
    if hasattr(quest, "options") and quest.options:
        quest.options = [opt.lower() for opt in quest.options]

    return quest


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
    result = await db.execute(select(Quest).where(Quest.id == quest_id))
    quest = result.scalars().first()
    if quest is None:
        raise ValueError(f"Quest not found: {quest_id}")

    is_correct = quest.correct_answer.lower() == given_answer.lower()
    xp_earned = _compute_xp(is_correct)
    pack_score = _compute_pack_score(is_correct)

    submission = QuestSubmission(
        quest_id=quest.id,
        user_id=user_id,
        given_answer=given_answer,
        is_correct=is_correct,
        xp_earned=xp_earned,
        pack_score=pack_score,
    )
    db.add(submission)
    await db.flush()
    return quest, submission


# ── Private helpers — implement these ─────────────────────────────────────────

async def _pick_content(
    db: AsyncSession,
    user_id: str,
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
    query = select(LanguageContent).where(LanguageContent.is_active == True)

    # Filter by scenario_tag if provided
    if scenario_tag:
        query = query.where(LanguageContent.scenario_tags.contains(scenario_tag))

    # If difficulty_target provided, get 5 nearest by difficulty
    if difficulty_target is not None:
        # Get rows with difficulty closest to target (within ±0.2 range)
        min_diff = max(0.0, difficulty_target - 0.2)
        max_diff = min(1.0, difficulty_target + 0.2)

        query = query.where(
            LanguageContent.difficulty >= min_diff,
            LanguageContent.difficulty <= max_diff
        ).order_by(func.abs(LanguageContent.difficulty - difficulty_target)).limit(5)
    else:
        # No difficulty filter, just get all matching rows
        pass

    result = await db.execute(query)
    candidates = result.scalars().all()

    # print(f"_pick_content found {len(candidates)} candidates for user_id={user_id}, "
    #       f"scenario_tag={scenario_tag}, difficulty_target={difficulty_target}")

    if not candidates:
        return None

    # Pick randomly from candidates
    # print(f"_pick_content candidates: {random.choice(candidates)}")
    return random.choice(candidates)


async def _build_from_wordbank(db: AsyncSession, content: LanguageContent) -> Quest:
    """
    Build a Quest from a LanguageContent row.

    TODO:
      1. Replace target_fi in sentence_fi with .... → question_fi
      2. Replace target_en in sentence_en with .... → question_en
      3. Call _build_options() to get 4 lowercase shuffled options
      4. Persist and return Quest with source="wordbank"
    """
    question_fi = content.sentence_fi.replace(content.target_fi, "....")
    question_en = content.sentence_en.replace(content.target_en, "....")
    options = await _build_options(db, content)

    quest = Quest(
        content_id=content.id,
        source="wordbank",
        question_fi=question_fi,
        question_en=question_en,
        options=options,
        correct_answer=content.target_fi,
        difficulty=content.difficulty,
    )
    db.add(quest)
    await db.flush()
    return quest


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
    from app.services import llm_client

    # Pick a random word from language_content to seed the prompt
    result = await db.execute(
        select(LanguageContent.target_fi)
        .where(LanguageContent.is_active == True)
        .order_by(func.random())
        .limit(1)
    )
    seed_word = result.scalar_one_or_none()
    if not seed_word:
        raise RuntimeError("No language content available for LLM seeding")

    # Create prompt for LLM
    system = f"""You are a Finnish language learning assistant. Generate a fill-in-the-blank question about Finnish vocabulary.

The question should be appropriate for difficulty level {difficulty:.1f} (0.0=easy, 1.0=hard).
Context: {scenario}

Return ONLY valid JSON with this exact format:
{{
  "sentence_fi": "Finnish sentence with [TARGET] word to blank out",
  "sentence_en": "English translation of the sentence",
  "target_fi": "the Finnish word that gets blanked out",
  "target_en": "English translation of the target word",
  "distractors": ["wrong_option1", "wrong_option2", "wrong_option3"]
}}

Requirements:
- target_fi must appear exactly once in sentence_fi
- All distractors must be different Finnish words
- All options should be lowercase
- Make it educational and natural"""

    prompt = f"Generate a Finnish fill-in-the-blank question. Use '{seed_word}' as inspiration for the difficulty level. Make sure the target word fits naturally in a sentence."

    # Retry up to 3 times on failure
    for attempt in range(3):
        try:
            llm_response = await llm_client.generate_quest_json(prompt, system)

            # Validate the response
            required_keys = ["sentence_fi", "sentence_en", "target_fi", "target_en", "distractors"]
            if not all(key in llm_response for key in required_keys):
                raise ValueError(f"LLM response missing required keys: {list(llm_response.keys())}")

            sentence_fi = llm_response["sentence_fi"]
            sentence_en = llm_response["sentence_en"]
            target_fi = llm_response["target_fi"]
            target_en = llm_response["target_en"]
            distractors = llm_response["distractors"]

            # Validate target_fi appears in sentence_fi
            if target_fi not in sentence_fi:
                raise ValueError(f"target_fi '{target_fi}' not found in sentence_fi '{sentence_fi}'")

            # Build the quest
            question_fi = sentence_fi.replace(target_fi, "....")
            question_en = sentence_en.replace(target_en, "....")

            # Combine correct answer with distractors and lowercase everything
            options = [target_fi.lower()] + [d.lower() for d in distractors]
            random.shuffle(options)

            quest = Quest(
                source="llm",
                question_fi=question_fi,
                question_en=question_en,
                options=options,
                correct_answer=target_fi,
                difficulty=difficulty,
            )
            db.add(quest)
            await db.flush()
            return quest

        except Exception as e:
            if attempt == 2:  # Last attempt
                raise RuntimeError(f"LLM quest generation failed after 3 attempts: {e}") from e
            # Continue to next attempt


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
    query = (
        select(LanguageContent.target_fi)
        .where(
            LanguageContent.is_active == True,
            LanguageContent.id != content.id,
        )
        .order_by(func.random())
        .limit(6)
    )
    result = await db.execute(query)
    distractors = [
        target.lower()
        for target in result.scalars().all()
        if target and target.lower() != content.target_fi.lower()
    ]

    unique_distractors: list[str] = []
    for item in distractors:
        if item not in unique_distractors:
            unique_distractors.append(item)
        if len(unique_distractors) >= 3:
            break

    fallback = [
        "kahvia",
        "vettä",
        "teetä",
        "maitoa",
        "leipää",
        "omenaa",
        "kirjaa",
        "aamua",
        "kahvi",
        "uima",
    ]
    for pad in fallback:
        if len(unique_distractors) >= 3:
            break
        if pad not in unique_distractors and pad != content.target_fi.lower():
            unique_distractors.append(pad)

    options = [content.target_fi.lower(), *unique_distractors[:3]]
    random.shuffle(options)
    return options


def _compute_xp(is_correct: bool) -> int:
    """Return 10 XP for correct, 2 XP for trying."""
    return 10 if is_correct else 2


def _compute_pack_score(is_correct: bool) -> float:
    """
    Correct: random float in [0.50, 1.00]
    Wrong:   random float in [0.00, 0.40]
    """
    if is_correct:
        return random.uniform(0.50, 1.00)
    return random.uniform(0.00, 0.40)

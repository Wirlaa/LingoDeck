"""
Challenge service.

Picks a sentence from the language_content table, blanks out the target word,
pulls 3 distractor options from other rows, shuffles all 4, and persists
the challenge so it can be scored later.
"""

import random
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import func

from app.models.challenge import Challenge
from app.models.language_content import LanguageContent

# Pack is awarded when pack_score is at or above this threshold
PACK_AWARD_THRESHOLD = 0.50


async def generate_challenge(
    db: AsyncSession,
    user_id: str,
    scenario_tag: str | None = None,
    difficulty_target: float | None = None,
) -> Challenge:
    """
    Generate one fill-in-the-blank challenge.

    Steps:
      1. Pick a LanguageContent row based on scenario_tag and difficulty_target
      2.  Build the blanked Finnish and English sentences
      3.   Pull 3 distractor target_fi values from other rows
      4.  Shuffle all 4 options
      5.  Persist the Challenge and return it
    """
    content = await _pick_content(db, scenario_tag, difficulty_target)
    question_fi, question_en = _blank_sentence(content)
    options = await _build_options(db, content)

    challenge = Challenge(
        id=uuid.uuid4(),
        content_id=content.id,
        question_fi=question_fi,
        question_en=question_en,
        options=options,
        correct_answer=content.target_fi,
        difficulty=content.difficulty,
    )

    db.add(challenge)
    await db.flush()
    return challenge


def score_answer(correct_answer: str, given_answer: str) -> tuple[bool, str, int, float]:
    """
    Score a multiple choice answer.

    Returns (is_correct, feedback, xp_earned, pack_score).

    Since this is multiple choice I decided that doing exact match is better
    than a fuzzy query search. After testing, I will see if it works or if we
    need something more advanced.
    The options shown to the player are the exact strings from the DB
    so there is no need for fuzzy matching.
    """
    is_correct = correct_answer.strip() == given_answer.strip()

    if is_correct:
        feedback = "Correct!"
    else:
        feedback = f'The answer was "{correct_answer}".'

    xp_earned = _compute_xp(is_correct)
    pack_score = _compute_pack_score(is_correct)

    return is_correct, feedback, xp_earned, pack_score


# Helper functions

async def _pick_content(
    db: AsyncSession,
    scenario_tag: str | None,
    difficulty_target: float | None,
) -> LanguageContent:
    """Pick one active LanguageContent row."""

    query = select(LanguageContent).where(LanguageContent.is_active.is_(True))

    if scenario_tag:
        query = query.where(
            LanguageContent.scenario_tags.contains(scenario_tag)
        )

    if difficulty_target is not None:
        # Pick the 5 rows nearest to the target difficulty, then choose randomly
        # among them so we get some variety
        query = query.order_by(
            func.abs(LanguageContent.difficulty - difficulty_target)
        ).limit(5)
        result = await db.execute(query)
        rows = result.scalars().all()

        if not rows:
            raise ValueError(
                f"No content found for scenario_tag={scenario_tag} "
                f"difficulty_target={difficulty_target}. Run the seeder first."
            )

        return random.choice(rows)

    # No difficulty target - just pick a random active row
    query = query.order_by(func.random()).limit(1)
    result = await db.execute(query)
    row = result.scalar_one_or_none()

    if row is None:
        raise ValueError("No language content found. Run the seeder first.")

    return row


def _blank_sentence(content: LanguageContent) -> tuple[str, str]:
    """
    Replace the target word in both sentences with ....

    e.g.
      sentence_fi: "Haluaisin kupillisen kahvia, kiitos."
      target_fi:   "kahvia"
      result:      "Haluaisin kupillisen ...., kiitos."
    """
    question_fi = content.sentence_fi.replace(content.target_fi, "....", 1)
    question_en = content.sentence_en.replace(content.target_en, "....", 1)
    return question_fi, question_en


async def _build_options(
    db: AsyncSession,
    content: LanguageContent,
) -> list[str]:
    """
    Pull 3 distractor target_fi values from other rows and shuffle with the correct answer.

    Distractors are pulled randomly from the whole table (excluding the correct row)
    so they can be from any difficulty or scenario. This is intentional - a mix of
    easy and hard distractors makes the choices more interesting.
    """
    distractor_query = (
        select(LanguageContent.target_fi)
        .where(
            LanguageContent.is_active.is_(True),
            LanguageContent.id != content.id,
            LanguageContent.target_fi != content.target_fi,
        )
        .order_by(func.random())
        .limit(3)
    )

    result = await db.execute(distractor_query)
    distractors = list(result.scalars().all())

    # If the DB is very small and we couldn't get 3 distractors, pad with generics
    fillers = ["kahvia", "vettä", "teetä", "maitoa", "ruokaa", "leipää"]
    while len(distractors) < 3:
        filler = random.choice(fillers)
        if filler not in distractors and filler != content.target_fi:
            distractors.append(filler)

    options = distractors + [content.target_fi]
    random.shuffle(options)
    return options


def _compute_xp(is_correct: bool) -> int:
    """
    Simple XP for now - correct gets 10, wrong gets 2 for trying.
    Can make this difficulty-weighted later.
    """
    return 10 if is_correct else 2


def _compute_pack_score(is_correct: bool) -> float:
    """
    Pack score determines the quality of the card pack awarded.
    Correct answer: random score between 0.5 and 1.0 (always awards a pack)
    Wrong answer: random score between 0.0 and 0.4 (never awards a pack)
    The threshold for awarding a pack is 0.5 (PACK_AWARD_THRESHOLD).
    """
    if is_correct:
        return round(random.uniform(0.50, 1.00), 4)
    return round(random.uniform(0.00, 0.40), 4)

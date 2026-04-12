"""
question_engine.py — generates battle questions from deck cards using LLM.

Each card in the player's deck gets one question.
The LLM generates a Finnish fill-in-the-blank sentence where the card's word is the blank.
Now supports valid_answers — multiple deck words can be correct for the same blank.
"""

import asyncio
import json
import logging
import uuid as _uuid

from app.models.challenge_question import ChallengeQuestion
from app.services.llm_client import generate_kela_json

logger = logging.getLogger(__name__)

_SYSTEM = (
    "You are a Finnish language teacher creating fill-in-the-blank exercises. "
    "Respond ONLY with valid JSON. No markdown, no explanation."
)

_PROMPT = """Generate a fill-in-the-blank Finnish sentence for a language learning card game.

Scenario: {scenario}
Target word (the BLANK in the sentence): {word}
Difficulty: {difficulty} (0.0=beginner, 1.0=advanced Finnish)
Other words in the player's deck: {other_words}

RULES:
1. "{word}" MUST appear word-for-word inside "sentence_fi"
2. The sentence must sound INCOMPLETE without "{word}"
3. DO NOT put "{word}" as a trailing greeting/filler — it must be the key content word
4. In "valid_answers" include ALL deck words (from the list above) that would
   grammatically AND semantically work in the blank — be generous with synonyms
5. Make the sentence specific enough that NOT every word works

Return ONLY this JSON (no markdown):
{{
  "sentence_fi": "Finnish sentence containing {word} as the key blank",
  "sentence_en": "English translation",
  "target_fi": "{word}",
  "target_en": "English meaning of {word}",
  "valid_answers": ["{word}"],
  "distractor_1_fi": "wrong Finnish word (same word class)",
  "distractor_2_fi": "wrong Finnish word 2",
  "distractor_3_fi": "wrong Finnish word 3"
}}"""


class GeneratedQuestion:
    def __init__(
        self,
        question_fi: str,
        question_en: str,
        options: list[str],
        correct_answer: str,
        valid_answers: list[str],
        difficulty: float,
        source: str,
        deck_card_id: str | None = None,
        deck_word_fi: str | None = None,
        tags: list[str] | None = None,
    ):
        self.question_fi    = question_fi
        self.question_en    = question_en
        self.options        = options
        self.correct_answer = correct_answer
        self.valid_answers  = valid_answers
        self.difficulty     = difficulty
        self.source         = source
        self.deck_card_id   = deck_card_id
        self.deck_word_fi   = deck_word_fi
        self.tags           = tags or []


async def generate_for_deck(
    deck: list[dict],
    scenario: str,
) -> list[GeneratedQuestion]:
    """Generate one question per deck card using the LLM."""
    all_words = [c.get("word_fi", "") for c in deck]
    tasks = [
        _generate_one(card, scenario, all_words)
        for card in deck
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    questions = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.warning(f"LLM failed for card {deck[i].get('word_fi')}: {result}")
            questions.append(_fallback(deck[i], scenario))
        else:
            questions.append(result)

    return questions


async def _generate_one(card: dict, scenario: str, all_words: list[str]) -> GeneratedQuestion:
    word       = card.get("word_fi", "")
    difficulty = card.get("power", 5) / 50.0
    other_words = [w for w in all_words if w != word]

    prompt = _PROMPT.format(
        scenario=scenario,
        word=word,
        difficulty=round(difficulty, 2),
        other_words=", ".join(other_words[:10]) if other_words else "none",
    )

    raw = await generate_kela_json(prompt, _SYSTEM)
    return _parse_raw(raw, card, difficulty)


def _parse_raw(raw: dict, card: dict, difficulty: float) -> GeneratedQuestion:
    required = ["sentence_fi", "sentence_en", "target_fi", "target_en",
                "distractor_1_fi", "distractor_2_fi", "distractor_3_fi"]
    for f in required:
        if f not in raw:
            raise ValueError(f"Missing field: {f}")

    target_fi    = raw["target_fi"].strip()
    sentence_fi  = raw["sentence_fi"].strip()
    sentence_en  = raw["sentence_en"].strip()

    if target_fi.lower() not in sentence_fi.lower():
        if len(target_fi) < 4 or target_fi[:4].lower() not in sentence_fi.lower():
            logger.warning(f"target_fi '{target_fi}' not in sentence '{sentence_fi}'")

    question_fi = sentence_fi.replace(target_fi, "....", 1)

    options = list(dict.fromkeys([
        target_fi,
        raw.get("distractor_1_fi", ""),
        raw.get("distractor_2_fi", ""),
        raw.get("distractor_3_fi", ""),
    ]))
    if len(options) < 2:
        logger.warning(f"Duplicate options for '{target_fi}': {options}")

    # valid_answers: the target + anything the LLM said is also valid
    llm_valid = raw.get("valid_answers", [target_fi])
    valid_answers = list({v.strip().lower() for v in llm_valid if v.strip()})
    if target_fi.lower() not in valid_answers:
        valid_answers.append(target_fi.lower())

    return GeneratedQuestion(
        question_fi    = question_fi,
        question_en    = sentence_en,
        options        = options,
        correct_answer = target_fi.lower(),
        valid_answers  = valid_answers,
        difficulty     = difficulty,
        source         = "llm",
        deck_card_id   = card.get("card_id"),
        deck_word_fi   = target_fi,
        tags           = card.get("tags", []),
    )


def _fallback(card: dict, scenario: str) -> GeneratedQuestion:
    word_fi = card.get("word_fi", "sana")
    word_en = card.get("word_en", "word")
    sentence_fi = f"Tarvitsen {word_fi} tähän tilanteeseen."
    question_fi = f"Tarvitsen .... tähän tilanteeseen."
    return GeneratedQuestion(
        question_fi    = question_fi,
        question_en    = f"I need {word_en} for this situation.",
        options        = [word_fi, "apua", "lisää", "muuta"],
        correct_answer = word_fi.lower(),
        valid_answers  = [word_fi.lower()],
        difficulty     = 0.2,
        source         = "fallback",
        deck_card_id   = card.get("card_id"),
        deck_word_fi   = word_fi,
        tags           = card.get("tags", []),
    )


def question_to_db(q: GeneratedQuestion, session_id: _uuid.UUID) -> ChallengeQuestion:
    obj = ChallengeQuestion(
        id             = _uuid.uuid4(),
        source         = q.source,
        question_fi    = q.question_fi,
        question_en    = q.question_en,
        options        = q.options,
        correct_answer = q.correct_answer,
        difficulty     = q.difficulty,
        tags           = q.valid_answers,   # store valid_answers in tags column
        deck_card_id   = q.deck_card_id,
        deck_word_fi   = q.deck_word_fi,
    )
    return obj

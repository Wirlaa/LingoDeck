"""
LLM Boss service — FULL CODE.

Only used for the kela_boss scenario.

Flow:
  1. Receive the player's deck (list of cards with their Finnish words)
  2. Send the deck to Claude and ask for one fill-in-the-blank question per card
  3. Claude returns structured JSON — one question object per card
  4. Randomly drop 2 questions so deck_size - 2 questions remain
  5. Persist as ChallengeQuestion rows with source="llm"
  6. Return the list for the boss fight question queue

Key difference from original monolith:
  Stores questions as ChallengeQuestion rows (local Challenge Service DB)
  instead of Challenge rows. Keeps the KELA boss fully self-contained
  inside the Challenge Service.
"""

import json
import random
import uuid

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.challenge_question import ChallengeQuestion

settings = get_settings()

KELA_CONTEXT = """
You are generating Finnish language learning questions set inside a KELA office
(the Finnish Social Insurance Institution).

KELA is notorious for bureaucratic Finnish - long compound nouns, passive voice,
partitive case everywhere, and formal register. The scenario should feel like
the player is trying to navigate a real Finnish bureaucracy.
"""

QUESTION_SCHEMA = """
{
  "questions": [
    {
      "card_word_fi": "the original Finnish word from the card",
      "sentence_fi": "a complete Finnish sentence set in a KELA context containing the target word",
      "sentence_en": "the English translation of the full sentence",
      "target_fi": "the exact word or inflected form that will be blanked out",
      "target_en": "the English translation of the target word",
      "distractor_1_fi": "a plausible but wrong Finnish word",
      "distractor_2_fi": "a plausible but wrong Finnish word",
      "distractor_3_fi": "a plausible but wrong Finnish word"
    }
  ]
}
"""


async def generate_kela_questions(
    db: AsyncSession,
    deck: list[dict],
) -> list[ChallengeQuestion]:
    """
    Generate one question per card in the deck, then drop 2 randomly.

    Parameters:
      deck: list of {card_id, rarity, word_fi, power}

    Returns a shuffled list of ChallengeQuestion rows (source="llm").
    """
    if len(deck) < settings.KELA_MIN_DECK_SIZE:
        raise ValueError(
            f"KELA requires at least {settings.KELA_MIN_DECK_SIZE} cards. "
            f"You have {len(deck)}."
        )

    raw_questions = await _call_llm(deck)
    questions = await _persist_questions(db, raw_questions)

    # Drop 2 randomly so the player cannot brute force by memorising card order
    # e.g. 8 cards → 6 questions, 10 cards → 8 questions
    if len(questions) > 2:
        questions = random.sample(questions, len(questions) - 2)

    random.shuffle(questions)
    return questions


# ── LLM caller ────────────────────────────────────────────────────────────────

async def _call_llm(deck: list[dict]) -> list[dict]:
    """
    Call Claude and return the parsed list of raw question dicts.
    Raises ValueError on API error or invalid JSON.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. Cannot run the KELA boss fight."
        )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    word_list = "\n".join(
        f"- {card['word_fi']} (rarity: {card['rarity']})"
        for card in deck
    )

    prompt = f"""
{KELA_CONTEXT}

The player's deck contains these Finnish words:
{word_list}

Generate exactly {len(deck)} fill-in-the-blank questions, one for each word above.

Rules:
1. Each sentence must be set in a realistic KELA office scenario
   (filling forms, asking about benefits, dealing with bureaucracy)
2. The target_fi must appear EXACTLY in sentence_fi so it can be blanked out
3. The target_fi should use the grammatically correct inflected form for the sentence
   e.g. if the card word is "tuki" but the sentence needs partitive, use "tukea"
4. The 3 distractors must be real Finnish words that are plausible but clearly wrong
5. All 4 options (target + 3 distractors) should be roughly the same word type
   so the player cannot guess by elimination
6. sentence_en must be a natural English translation of the full sentence_fi
7. Vary difficulty — mix simpler and harder sentences across the deck

Return ONLY valid JSON matching this exact schema, no other text:
{QUESTION_SCHEMA}
"""

    try:
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()

        # Strip markdown code fences if Claude wraps the JSON
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        data = json.loads(response_text)
        return data.get("questions", [])

    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}") from e
    except anthropic.APIError as e:
        raise ValueError(f"Anthropic API error: {e}") from e


# ── Persistence ────────────────────────────────────────────────────────────────

async def _persist_questions(
    db: AsyncSession,
    raw_questions: list[dict],
) -> list[ChallengeQuestion]:
    """
    Convert raw LLM output into ChallengeQuestion rows (source="llm") and flush.

    Skips malformed entries rather than crashing the whole boss fight start.
    Skips entries where target_fi doesn't actually appear in sentence_fi.
    """
    questions: list[ChallengeQuestion] = []

    for raw in raw_questions:
        try:
            sentence_fi = raw["sentence_fi"]
            sentence_en = raw["sentence_en"]
            target_fi   = raw["target_fi"]
            target_en   = raw["target_en"]
            d1 = raw["distractor_1_fi"]
            d2 = raw["distractor_2_fi"]
            d3 = raw["distractor_3_fi"]
        except KeyError as e:
            print(f"[llm_boss] Skipping malformed question, missing key: {e}")
            continue

        if target_fi not in sentence_fi:
            print(
                f"[llm_boss] Skipping question: target '{target_fi}' "
                f"not found in sentence '{sentence_fi}'"
            )
            continue

        question_fi = sentence_fi.replace(target_fi, "....", 1)
        question_en = sentence_en.replace(target_en, "....", 1)

        options = [target_fi, d1, d2, d3]
        random.shuffle(options)

        cq = ChallengeQuestion(
            id=uuid.uuid4(),
            external_id=None,       # LLM questions have no external Quest Service ID
            source="llm",
            question_fi=question_fi,
            question_en=question_en,
            options=options,
            correct_answer=target_fi,
            difficulty=0.90,        # KELA questions are always Legendary tier difficulty
        )

        db.add(cq)
        questions.append(cq)

    await db.flush()
    return questions

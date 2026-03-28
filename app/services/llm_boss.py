"""
LLM Boss service.

Only used for the kela_boss scenario (can expand it later for other 'boss fights').

Flow:
  - Receive the player's deck (list of cards with their Finnish words)
  = Send the deck to Claude and ask for one fill-in-the-blank challenge per card
  - Claude returns structured JSON - one challenge object per card
  - Randomly drop 2 challenges so deck_size - 2 challenges remain
  - Persist all challenges as regular Challenge rows
  - Return the list of Challenge IDs for the battle queue

"""

import json
import random
import uuid

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.challenge import Challenge

settings = get_settings()

# The KELA scenario context injected into every prompt
KELA_CONTEXT = """
You are generating Finnish language learning challenges set inside a KELA office
(the Finnish Social Insurance Institution).

KELA is notorious for bureaucratic Finnish - long compound nouns, passive voice,
partitive case everywhere, and formal register. The scenario should feel like
the player is trying to navigate a real Finnish bureaucracy.
"""

CHALLENGE_SCHEMA = """
{
  "challenges": [
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


async def generate_kela_challenges(
    db: AsyncSession,
    deck: list[dict],
) -> list[Challenge]:
    """
    Generate one challenge per card in the deck, then drop 2 randomly.

    Parameters
    deck : list of {card_id, rarity, word_fi, power}
    """
    if len(deck) < settings.KELA_MIN_DECK_SIZE:
        raise ValueError(
            f"KELA requires at least {settings.KELA_MIN_DECK_SIZE} cards. "
            f"You have {len(deck)}."
        )

    raw_challenges = await _call_llm(deck)
    challenges = await _persist_challenges(db, raw_challenges)

    # Drop 2 randomly so the player cannot brute force
    # e.g. 8 cards → 6 challenges, 10 cards → 8 challenges
    if len(challenges) > 2:
        challenges = random.sample(challenges, len(challenges) - 2)

    # Shuffle the remaining challenges so difficulty order is unpredictable
    random.shuffle(challenges)
    return challenges


# LLM Caller

async def _call_llm(deck: list[dict]) -> list[dict]:
    """
    Call Claude and return the parsed list of challenge dicts.
    Falls back to an empty list if the API call fails so the battle
    can still start with whatever challenges were generated.
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

Generate exactly {len(deck)} fill-in-the-blank challenges, one for each word above.

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
7. Vary difficulty - mix simpler and harder sentences across the deck

Return ONLY valid JSON matching this exact schema, no other text:
{CHALLENGE_SCHEMA}
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
        return data.get("challenges", [])

    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}") from e
    except anthropic.APIError as e:
        raise ValueError(f"Anthropic API error: {e}") from e

async def _persist_challenges(
    db: AsyncSession,
    raw_challenges: list[dict],
) -> list[Challenge]:
    """
    Convert raw LLM output into Challenge rows and save them.

    Each challenge gets a placeholder content_id since LLM challenges
    are not tied to a specific LanguageContent row.
    """
    challenges: list[Challenge] = []

    for raw in raw_challenges:
        try:
            sentence_fi = raw["sentence_fi"]
            sentence_en = raw["sentence_en"]
            target_fi = raw["target_fi"]
            target_en = raw["target_en"]
            d1 = raw["distractor_1_fi"]
            d2 = raw["distractor_2_fi"]
            d3 = raw["distractor_3_fi"]
        except KeyError as e:
            # Skip malformed challenge objects rather than crashing the whole battle
            print(f"Skipping malformed LLM challenge, missing key: {e}")
            continue

        # Validate that target actually appears in the sentence
        if target_fi not in sentence_fi:
            print(
                f"Skipping LLM challenge: target '{target_fi}' "
                f"not found in sentence '{sentence_fi}'"
            )
            continue

        # Build blanked sentences
        question_fi = sentence_fi.replace(target_fi, "....", 1)
        question_en = sentence_en.replace(target_en, "....", 1)

        # Build and shuffle options
        options = [target_fi, d1, d2, d3]
        random.shuffle(options)

        challenge = Challenge(
            id=uuid.uuid4(),
            # LLM challenges use a nil UUID as content_id
            # since they are not tied to a seed data row
            content_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
            question_fi=question_fi,
            question_en=question_en,
            options=options,
            correct_answer=target_fi,
            difficulty=0.90,  # KELA challenges are always Legendary tier difficulty
        )

        db.add(challenge)
        challenges.append(challenge)

    await db.flush()
    return challenges

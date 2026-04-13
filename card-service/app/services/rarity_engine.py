"""
Rarity engine — probability-weighted rarity rolling based on word difficulty.

When opening a pack, each slot is filled by:
  1. Picking a word from the wordbank (scenario-filtered if bias set)
  2. Using the word's difficulty to determine rarity
  3. Returning the word + rarity

This means rarity is NOT random — it reflects actual word difficulty.
A Legendary card is always a hard KELA bureaucratic word.
"""
import random

# Rarity → difficulty band (must match shared/models/language_content.py Rarity enum)
RARITY_DIFFICULTY_BANDS: dict[str, tuple[float, float]] = {
    "Common":    (0.00, 0.20),
    "Uncommon":  (0.21, 0.40),
    "Rare":      (0.41, 0.60),
    "Epic":      (0.61, 0.80),
    "Legendary": (0.81, 1.00),
}

def difficulty_to_rarity(difficulty: float) -> str:
    if difficulty <= 0.20: return "Common"
    if difficulty <= 0.40: return "Uncommon"
    if difficulty <= 0.60: return "Rare"
    if difficulty <= 0.80: return "Epic"
    return "Legendary"


# Weighted pack roll — biased toward lower rarities so progression feels earnable
PACK_RARITY_WEIGHTS: dict[str, float] = {
    "Common":    0.50,
    "Uncommon":  0.25,
    "Rare":      0.15,
    "Epic":      0.07,
    "Legendary": 0.03,
}

def roll_target_rarity() -> str:
    """Roll a rarity tier for one pack slot. Used to decide which difficulty band to pull from."""
    rarities = list(PACK_RARITY_WEIGHTS.keys())
    weights  = list(PACK_RARITY_WEIGHTS.values())
    return random.choices(rarities, weights=weights, k=1)[0]

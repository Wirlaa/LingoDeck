"""
content_rules.py — scenarios, tags, difficulty rules, scenario bonuses.

This module is the single source of truth for all content-related constants.
No battle logic here — just rules about what cards, scenarios, and effects mean.

Scenario bonuses make deck composition matter:
  - politeness cards stronger in cafe/interview
  - bureaucracy cards stronger in kela
  - navigation cards stronger in directions

This means a player who collects KELA vocabulary has a real advantage
in the KELA boss fight, not just cosmetically but mechanically.
"""

from dataclasses import dataclass, field
from enum import Enum


# Scenarios 
class Scenario(str, Enum):
    CAFE_ORDER      = "cafe_order"
    JOB_INTERVIEW   = "job_interview"
    ASKING_DIRECTIONS = "asking_directions"
    KELA_BOSS       = "kela_boss"
    GENERAL         = "general"


# Human-readable names and descriptions for each scenario
SCENARIO_INFO: dict[str, dict] = {
    Scenario.CAFE_ORDER: {
        "name": "Kahvila (Café Order)",
        "description": "Order coffee and pastries in Finnish. Politeness matters here.",
        "difficulty_range": (0.1, 0.5),
        "ai_name": "Impatient Barista",
        "ai_taunts": [
            "Mitä saat olla? (What will you have?)",
            "Seuraava! (Next!)",
            "Emme ymmärrä tilauksiasi. (We don't understand your order.)",
            "Keittiö odottaa. (The kitchen is waiting.)",
        ],
        "win_text": "Tilaus valmis! Your Finnish is café-ready.",
        "lose_text": "Kahvi jäi kylmäksi. The coffee went cold while you struggled.",
    },
    Scenario.JOB_INTERVIEW: {
        "name": "Työhaastattelu (Job Interview)",
        "description": "Survive a Finnish job interview. Formal vocabulary wins.",
        "difficulty_range": (0.3, 0.7),
        "ai_name": "HR Manager Virtanen",
        "ai_taunts": [
            "Kerro itsestäsi. (Tell me about yourself.)",
            "Miksi haet tätä paikkaa? (Why are you applying for this position?)",
            "Emme ole vakuuttuneita. (We are not convinced.)",
            "Palaamme asiaan. (We will get back to you.)",
        ],
        "win_text": "Olet palkattu! You got the job. Your Finnish impressed HR.",
        "lose_text": "Otamme yhteyttä. They will be in touch. They won't.",
    },
    Scenario.ASKING_DIRECTIONS: {
        "name": "Reittiohje (Asking Directions)",
        "description": "Navigate Finnish streets. Location vocabulary is your weapon.",
        "difficulty_range": (0.1, 0.4),
        "ai_name": "Lost Tourist",
        "ai_taunts": [
            "En ymmärrä. (I don't understand.)",
            "Missä bussipysäkki on? (Where is the bus stop?)",
            "Oletko varma? (Are you sure?)",
            "Eksyimme taas. (We got lost again.)",
        ],
        "win_text": "Perillä! You navigated successfully. Finland conquered.",
        "lose_text": "Eksyimme. You're lost somewhere in Lahti.",
    },
    Scenario.KELA_BOSS: {
        "name": "KELA (Social Insurance Boss)",
        "description": "Face the Finnish bureaucracy. Bureaucratic Finnish is your only weapon.",
        "difficulty_range": (0.6, 1.0),
        "ai_name": "KELA Form 7b",
        "ai_taunts": [
            "Hakemus hylätty. Syy: puutteellinen liite. (Application rejected. Reason: missing attachment.)",
            "Järjestelmä ei tunnista tätä pyyntöä. (The system does not recognise this request.)",
            "Käsittelyaika on 6-8 viikkoa. (Processing time is 6-8 weeks.)",
            "Tarvitsemme lisäselvitystä. (We require further clarification.)",
            "Lomake on vanhentunut. (The form is outdated.)",
            "Kirjaamme vastauksenne. (We are logging your response.)",
        ],
        "win_text": "Hakemus hyväksytty! A miracle. KELA approved your application.",
        "lose_text": "Kirje postissa. A letter is in the mail. In Finnish.",
    },
    Scenario.GENERAL: {
        "name": "General Finnish",
        "description": "General Finnish vocabulary.",
        "difficulty_range": (0.0, 1.0),
        "ai_name": "Finnish Language",
        "ai_taunts": ["Yritä uudelleen. (Try again.)"],
        "win_text": "Hyvin tehty! Well done.",
        "lose_text": "Harjoitellaan lisää. Let's practice more.",
    },
}


# ─Tags
class Tag(str, Enum):
    # Content tags
    POLITENESS   = "politeness"
    BUREAUCRACY  = "bureaucracy"
    NAVIGATION   = "navigation"
    FOOD         = "food"
    WORKPLACE    = "workplace"
    NUMBERS      = "numbers"
    GREETINGS    = "greetings"
    # Effect tags (for card matching)
    BOOST        = "boost"
    SHIELD       = "shield"
    FOCUS        = "focus"
    RETRY        = "retry"
    COMBO        = "combo"


# Tags that are strong in each scenario (used for scenario_bonus calculation)
SCENARIO_STRONG_TAGS: dict[str, list[str]] = {
    Scenario.CAFE_ORDER:        [Tag.POLITENESS, Tag.FOOD],
    Scenario.JOB_INTERVIEW:     [Tag.POLITENESS, Tag.WORKPLACE],
    Scenario.ASKING_DIRECTIONS: [Tag.NAVIGATION, Tag.NUMBERS],
    Scenario.KELA_BOSS:         [Tag.BUREAUCRACY, Tag.WORKPLACE],
    Scenario.GENERAL:           [],
}

# Scenario bonus multiplier when a card's tags match the scenario
SCENARIO_BONUS_MULTIPLIER = 1.5


# Card effect

class EffectType(str, Enum):
    NONE    = "none"
    SHIELD  = "shield"   # reduce wrong-answer meter penalty
    BOOST   = "boost"    # add extra meter gain on correct answer
    FOCUS   = "focus"    # remove one wrong option before answering
    RETRY   = "retry"    # allow one free retry on wrong answer (must still answer correctly)
    COMBO   = "combo"    # extra meter gain if card tag matches scenario


# Effect strength by rarity — Common effects are safe, Legendary effects are powerful but risky
EFFECT_STRENGTH_BY_RARITY: dict[str, float] = {
    "Common":    0.5,
    "Uncommon":  0.75,
    "Rare":      1.0,
    "Epic":      1.5,
    "Legendary": 2.0,
}

# Risk by rarity — higher rarity = more variance
RISK_BY_RARITY: dict[str, float] = {
    "Common":    0.0,   # no risk, reliable
    "Uncommon":  0.1,
    "Rare":      0.2,
    "Epic":      0.3,
    "Legendary": 0.5,   # high risk, high reward
}


# meter

@dataclass
class MeterConfig:
    """Configuration for the battle meter."""
    start: int      = 0
    win_threshold:  int = 100
    lose_threshold: int = -100

    # Base meter changes per turn
    correct_base: int = 20     # gain on correct answer
    wrong_base:   int = -15    # loss on wrong answer

    # Bonus/penalty modifiers
    scenario_bonus: float = 1.5    # multiplier when card tags match scenario
    legendary_risk: float = 0.5    # chance legendary card fails (risk_level)


DEFAULT_METER_CONFIG = MeterConfig()


# Difficulty rules 
def difficulty_to_rarity(difficulty: float) -> str:
    """Convert a difficulty float to a rarity string."""
    if difficulty <= 0.20: return "Common"
    if difficulty <= 0.40: return "Uncommon"
    if difficulty <= 0.60: return "Rare"
    if difficulty <= 0.80: return "Epic"
    return "Legendary"


def rarity_to_difficulty_band(rarity: str) -> tuple[float, float]:
    """Return the (min, max) difficulty band for a rarity."""
    bands = {
        "Common":    (0.00, 0.20),
        "Uncommon":  (0.21, 0.40),
        "Rare":      (0.41, 0.60),
        "Epic":      (0.61, 0.80),
        "Legendary": (0.81, 1.00),
    }
    return bands.get(rarity, (0.0, 1.0))


# Question templates (deterministic fallback) 

# Used when LLM generation fails — guarantees valid questions for demos/grading.
# Keyed by scenario, each template has a sentence with {word} placeholder.
FALLBACK_TEMPLATES: dict[str, list[dict]] = {
    Scenario.CAFE_ORDER: [
        {
            "template_fi": "Haluaisin kupillisen {word}, kiitos.",
            "template_en": "I would like a cup of {word}, please.",
            "target_en": "the target word",
            "distractors_fi": ["teetä", "maitoa", "mehua"],
        },
        {
            "template_fi": "Onko teillä {word}?",
            "template_en": "Do you have {word}?",
            "target_en": "the target word",
            "distractors_fi": ["pullaa", "kakkua", "sämpylää"],
        },
    ],
    Scenario.JOB_INTERVIEW: [
        {
            "template_fi": "Minulla on {word} vuoden kokemus alalta.",
            "template_en": "I have {word} years of experience in the field.",
            "target_en": "the target word",
            "distractors_fi": ["kaksi", "kolme", "viisi"],
        },
        {
            "template_fi": "Haen {word} tehtävää.",
            "template_en": "I am applying for the {word} position.",
            "target_en": "the target word",
            "distractors_fi": ["johtajan", "assistentin", "myyjän"],
        },
    ],
    Scenario.ASKING_DIRECTIONS: [
        {
            "template_fi": "Missä {word} on?",
            "template_en": "Where is the {word}?",
            "target_en": "the target word",
            "distractors_fi": ["pankki", "apteekki", "kauppa"],
        },
        {
            "template_fi": "Meneekö tämä bussi {word}?",
            "template_en": "Does this bus go to {word}?",
            "target_en": "the target word",
            "distractors_fi": ["rautatieasemalle", "lentokentälle", "satamaan"],
        },
    ],
    Scenario.KELA_BOSS: [
        {
            "template_fi": "Tarvitsen {word} hakemukseeni.",
            "template_en": "I need {word} for my application.",
            "target_en": "the target word",
            "distractors_fi": ["liitteitä", "todistuksia", "lomakkeita"],
        },
        {
            "template_fi": "Hakemus on {word} käsittelyssä.",
            "template_en": "The application is {word} processing.",
            "target_en": "the target word",
            "distractors_fi": ["nopeassa", "hitaassa", "normaalissa"],
        },
    ],
    Scenario.GENERAL: [
        {
            "template_fi": "Tarvitsen {word}.",
            "template_en": "I need {word}.",
            "target_en": "the target word",
            "distractors_fi": ["apua", "aikaa", "rahaa"],
        },
    ],
}

"""
battle_engine.py — deterministic battle resolution with combo chains.

Combo chain system:
  - correct_streak tracked per session
  - 3 in a row → ×1.5 meter gain
  - 5 in a row → ×2.0 meter gain
  - wrong answer resets streak to 0

Familiarity-scaled meter (replaces rarity):
  familiarity 1 (new word)      → base gain: 15, base penalty: -8
  familiarity 2 (practiced)     → base gain: 18, base penalty: -10
  familiarity 3 (familiar)      → base gain: 22, base penalty: -12
  familiarity 4 (confident)     → base gain: 28, base penalty: -15
  familiarity 5 (mastered)      → base gain: 35, base penalty: -20

This makes familiarity meaningful — mastered words win fights faster
but also punish mistakes more. beginner deck = slow and steady.
"""

from dataclasses import dataclass
from app.services.content_rules import (
    DEFAULT_METER_CONFIG,
    SCENARIO_STRONG_TAGS,
    SCENARIO_INFO,
)

FAMILIARITY_GAIN    = {1: 15, 2: 18, 3: 22, 4: 28, 5: 35}
FAMILIARITY_PENALTY = {1: -8, 2: -10, 3: -12, 4: -15, 5: -20}

COMBO_MULTIPLIERS = {
    1: 1.0,   # no streak
    2: 1.0,   # still no bonus
    3: 1.5,   # 3 in a row
    4: 1.5,
    5: 2.0,   # 5 in a row — domination
}


@dataclass
class TurnResult:
    is_correct: bool
    correct_answer: str
    given_answer: str
    feedback: str

    meter_before: int
    meter_delta: int
    meter_after: int
    meter_min: int
    meter_max: int

    answer_card_id: str

    # Combo chain
    correct_streak: int
    combo_multiplier: float
    combo_triggered: bool

    familiarity_level: int

    battle_status: str
    xp_earned: int
    ai_flavour: str | None
    hand_after: list[dict]
    max_streak: int


def resolve_turn(
    session_state: dict,
    question: dict,
    answer_card: dict,
    support_card: dict | None,  # kept for API compatibility, not used
    given_answer: str,
) -> TurnResult:
    """
    Resolve one battle turn. Pure deterministic logic.

    The answer card's familiarity_level determines meter stakes.
    Combo chain multiplies meter gain on consecutive correct answers.
    No support card effects — removed for cleaner design.
    """
    scenario     = session_state["scenario"]
    battle_meter = session_state["battle_meter"]
    win          = session_state.get("win_threshold", 100)
    lose         = session_state.get("lose_threshold", -100)
    current_turn = session_state.get("current_turn", 1)
    max_turns    = session_state.get("max_turns", 5)
    streak       = session_state.get("correct_streak", 0)
    max_streak_so_far = session_state.get("max_streak", 0)

    # Score the answer — accept any word the LLM marked as valid
    # valid_answers stored in question["tags"] (list of acceptable words)
    answer_lower  = given_answer.strip().lower()
    correct_lower = question["correct_answer"].strip().lower()
    valid_answers = [v.strip().lower() for v in (question.get("tags") or [])]

    is_correct = (
        answer_lower == correct_lower
        or answer_lower in valid_answers
    )

    # Familiarity-based meter stakes
    fam_level = int(answer_card.get("familiarity_level", 1))
    fam_level = max(1, min(5, fam_level))

    if is_correct:
        base_delta = FAMILIARITY_GAIN[fam_level]
        # Update streak
        new_streak = streak + 1
        # Combo multiplier
        combo_key = min(new_streak, 5)
        multiplier = COMBO_MULTIPLIERS.get(combo_key, 2.0)
        combo_triggered = multiplier > 1.0
        final_delta = int(base_delta * multiplier)
    else:
        base_delta  = FAMILIARITY_PENALTY[fam_level]
        new_streak  = 0
        multiplier  = 1.0
        combo_triggered = False
        final_delta = base_delta

    new_max_streak = max(max_streak_so_far, new_streak)

    # Update meter
    meter_before = battle_meter
    meter_after  = max(lose - 10, min(win + 10, meter_before + final_delta))

    # Check end conditions
    battle_status = _check_end(meter_after, win, lose, current_turn, max_turns)

    # XP
    xp = 10 if is_correct else 2

    # Feedback
    if is_correct:
        feedback = "Correct!"
        if combo_triggered:
            feedback += f" {new_streak}x combo! ×{multiplier}"
    else:
        feedback = f'Wrong. The answer was "{question["correct_answer"]}".'

    ai_flavour = _ai_flavour(scenario, is_correct, battle_status)

    hand_after = _update_hand(
        session_state.get("hand", []),
        answer_card,
        None,
        session_state.get("draw_pile", []),
    )

    return TurnResult(
        is_correct=is_correct,
        correct_answer=question["correct_answer"],
        given_answer=given_answer,
        feedback=feedback,
        meter_before=meter_before,
        meter_delta=final_delta,
        meter_after=meter_after,
        meter_min=lose,
        meter_max=win,
        answer_card_id=answer_card.get("card_id", ""),
        correct_streak=new_streak,
        combo_multiplier=multiplier,
        combo_triggered=combo_triggered,
        familiarity_level=fam_level,
        battle_status=battle_status,
        xp_earned=xp,
        ai_flavour=ai_flavour,
        hand_after=hand_after,
        max_streak=new_max_streak,
    )


def _check_end(meter: int, win: int, lose: int, turn: int, max_turns: int) -> str:
    if meter >= win: return "won"
    if meter <= lose: return "lost"
    if turn >= max_turns:
        if meter > 0: return "won"
        if meter < 0: return "lost"
        return "draw"
    return "active"


def _ai_flavour(scenario: str, is_correct: bool, status: str) -> str | None:
    import random
    info = SCENARIO_INFO.get(scenario, {})
    if status == "won":   return info.get("win_text")
    if status == "lost":  return info.get("lose_text")
    if status == "draw":  return "Tasapeli. It's a draw."
    if not is_correct:
        taunts = info.get("ai_taunts", ["Yritä uudelleen."])
        return random.choice(taunts)
    return None


def _update_hand(hand, answer_card, support_card, draw_pile):
    if not hand: return hand
    played = {answer_card.get("card_id", "")} if answer_card else set()
    remaining = [c for c in hand if c.get("card_id") not in played]
    n_draw = len(hand) - len(remaining)
    if draw_pile and n_draw > 0:
        remaining.extend(draw_pile[:n_draw])
    return remaining

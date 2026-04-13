"""
battle_engine.py — deterministic battle resolution.

Star-level scaled meter (replaces old familiarity 1-5 with 1-4):
  1★ (new word)     → gain: 15, penalty: -8
  2★ (practiced)    → gain: 22, penalty: -12
  3★ (familiar)     → gain: 28, penalty: -15
  4★ (mastered)     → gain: 35, penalty: -20

Combo chains:
  3 correct in a row → ×1.5 meter gain
  5 correct in a row → ×2.0 meter gain
  Wrong answer resets streak to 0

This makes deck quality matter — a 4★ deck wins faster but mistakes
also punish harder. A 2★ deck is slow and steady.

Card effects are NOT implemented here. That's a future feature.
The support_card param is accepted for API compatibility only.
"""
from dataclasses import dataclass
from app.services.content_rules import DEFAULT_METER_CONFIG, SCENARIO_INFO

# Star level → meter stakes
STAR_GAIN:    dict[int, int] = {1: 15, 2: 22, 3: 28, 4: 35}
STAR_PENALTY: dict[int, int] = {1: -8, 2: -12, 3: -15, 4: -20}

COMBO_MULTIPLIERS: dict[int, float] = {
    1: 1.0, 2: 1.0,
    3: 1.5, 4: 1.5,
    5: 2.0,
}


@dataclass
class TurnResult:
    is_correct:      bool
    correct_answer:  str
    given_answer:    str
    feedback:        str

    meter_before:    int
    meter_delta:     int
    meter_after:     int
    meter_min:       int
    meter_max:       int

    answer_card_id:  str
    star_level:      int

    correct_streak:  int
    combo_multiplier: float
    combo_triggered: bool

    battle_status:   str
    xp_earned:       int
    ai_flavour:      str | None
    hand_after:      list[dict]
    max_streak:      int


def resolve_turn(
    session_state: dict,
    question: dict,
    answer_card: dict,
    support_card: dict | None,   # reserved for future card effects
    given_answer: str,
) -> TurnResult:
    """
    Resolve one battle turn. Purely deterministic — no external calls.
    answer_card.star_level determines meter stakes.
    """
    scenario     = session_state["scenario"]
    battle_meter = session_state["battle_meter"]
    win          = session_state.get("win_threshold",  100)
    lose         = session_state.get("lose_threshold", -100)
    current_turn = session_state.get("current_turn", 1)
    max_turns    = session_state.get("max_turns", 5)
    streak       = session_state.get("correct_streak", 0)
    max_streak_so_far = session_state.get("max_streak", 0)

    # Score — valid_answers stored in question["tags"]
    answer_lower  = given_answer.strip().lower()
    correct_lower = question["correct_answer"].strip().lower()
    valid_answers = [v.strip().lower() for v in (question.get("tags") or [])]

    is_correct = (answer_lower == correct_lower or answer_lower in valid_answers)

    # Star-based meter stakes (clamp 1-4)
    star = int(answer_card.get("star_level", answer_card.get("familiarity_level", 1)))
    star = max(1, min(4, star))

    if is_correct:
        base_delta = STAR_GAIN[star]
        new_streak = streak + 1
        combo_key  = min(new_streak, 5)
        multiplier = COMBO_MULTIPLIERS.get(combo_key, 2.0)
        combo_triggered = multiplier > 1.0
        final_delta = int(base_delta * multiplier)
    else:
        base_delta      = STAR_PENALTY[star]
        new_streak      = 0
        multiplier      = 1.0
        combo_triggered = False
        final_delta     = base_delta

    new_max_streak = max(max_streak_so_far, new_streak)

    meter_before = battle_meter
    meter_after  = max(lose - 10, min(win + 10, meter_before + final_delta))
    battle_status = _check_end(meter_after, win, lose, current_turn, max_turns)

    xp = 2 if is_correct else 0   # battle XP (applied by game-backend to card-service)

    if is_correct:
        feedback = "Correct!"
        if combo_triggered:
            feedback += f" {new_streak}x combo! ×{multiplier}"
    else:
        feedback = f'Wrong. The answer was "{question["correct_answer"]}".\'

    ai_flavour = _ai_flavour(scenario, is_correct, battle_status)
    hand_after = _update_hand(
        session_state.get("hand", []),
        answer_card,
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
        star_level=star,
        correct_streak=new_streak,
        combo_multiplier=multiplier,
        combo_triggered=combo_triggered,
        battle_status=battle_status,
        xp_earned=xp,
        ai_flavour=ai_flavour,
        hand_after=hand_after,
        max_streak=new_max_streak,
    )


def _check_end(meter: int, win: int, lose: int, turn: int, max_turns: int) -> str:
    if meter >= win:  return "won"
    if meter <= lose: return "lost"
    if turn >= max_turns:
        if meter > 0: return "won"
        if meter < 0: return "lost"
        return "draw"
    return "active"


def _ai_flavour(scenario: str, is_correct: bool, status: str) -> str | None:
    import random
    info = SCENARIO_INFO.get(scenario, {})
    if status == "won":  return info.get("win_text")
    if status == "lost": return info.get("lose_text")
    if status == "draw": return "Tasapeli. It's a draw."
    if not is_correct:
        taunts = info.get("ai_taunts", ["Yritä uudelleen."])
        return random.choice(taunts)
    return None


def _update_hand(hand: list, answer_card: dict, draw_pile: list) -> list:
    if not hand:
        return hand
    played = {answer_card.get("card_id", "")}
    remaining = [c for c in hand if c.get("card_id") not in played]
    n_draw = len(hand) - len(remaining)
    if draw_pile and n_draw > 0:
        remaining.extend(draw_pile[:n_draw])
    return remaining

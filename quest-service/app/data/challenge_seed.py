"""
Predefined quest challenge definitions.
Loaded into quest_challenges table by POST /admin/seed-challenges.
"""

CHALLENGE_SEEDS = [
    # (slug, name, description, type, target, scenario_filter, pack_bias, cooldown_hours)
    (
        "first_steps",
        "First Steps",
        "Answer 5 questions correctly in any scenario.",
        "count_correct", 5, None, None, 12,
    ),
    (
        "getting_serious",
        "Getting Serious",
        "Answer 20 questions correctly in any scenario.",
        "count_correct", 20, None, None, 24,
    ),
    (
        "hot_streak",
        "Hot Streak",
        "Get 3 correct answers in a row.",
        "streak", 3, None, None, 12,
    ),
    (
        "on_fire",
        "On Fire",
        "Get 5 correct answers in a row.",
        "streak", 5, None, None, 24,
    ),
    (
        "cafe_regular",
        "Café Regular",
        "Answer 10 café questions correctly.",
        "count_correct", 10, "cafe_order", "cafe_order", 24,
    ),
    (
        "cafe_expert",
        "Café Expert",
        "Answer 25 café questions correctly.",
        "count_correct", 25, "cafe_order", "cafe_order", 48,
    ),
    (
        "navigator",
        "Navigator",
        "Answer 10 directions questions correctly.",
        "count_correct", 10, "asking_directions", "asking_directions", 24,
    ),
    (
        "wayfinder",
        "Wayfinder",
        "Answer 25 directions questions correctly.",
        "count_correct", 25, "asking_directions", "asking_directions", 48,
    ),
    (
        "professional",
        "Professional",
        "Answer 10 job interview questions correctly.",
        "count_correct", 10, "job_interview", "job_interview", 24,
    ),
    (
        "career_expert",
        "Career Expert",
        "Answer 25 job interview questions correctly.",
        "count_correct", 25, "job_interview", "job_interview", 48,
    ),
    (
        "kela_survivor",
        "KELA Survivor",
        "Answer 10 KELA questions correctly.",
        "count_correct", 10, "kela_boss", "kela_boss", 24,
    ),
    (
        "kela_master",
        "KELA Master",
        "Answer 25 KELA questions correctly.",
        "count_correct", 25, "kela_boss", "kela_boss", 48,
    ),
]

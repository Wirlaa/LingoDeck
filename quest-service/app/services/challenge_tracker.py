"""
Challenge tracker — updates quest challenge progress after each correct answer.

Called by quest_service.submit_answer() after scoring.
Returns list of completed challenges (if any), including the pack reward info.

Streak tracking:
  Streaks are session-local — they reset when the user answers incorrectly.
  The current_streak is passed in from the submit endpoint (game-backend tracks
  the running streak per session or we track it in the response).
  For simplicity, quest-service tracks streak within the progress row itself:
    - On correct answer: increment progress for streak challenges
    - On wrong answer:  reset all streak-type progress to 0

Cooldown:
  A challenge is only rewarded if last_rewarded_at is None or
  cooldown_hours have passed since last reward.
  After reward: progress resets to 0, times_completed++, last_rewarded_at = now.
"""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.challenge_progress import QuestChallenge, UserChallengeProgress


async def on_answer(
    db: AsyncSession,
    user_id: str,
    scenario: str,
    is_correct: bool,
) -> list[dict]:
    """
    Process one quest answer against all challenges.
    Returns list of newly completed challenge dicts (empty if none completed).
    Each dict: { challenge_id, slug, name, pack_scenario_bias }
    """
    challenges = await _load_challenges(db)
    completed = []

    for ch in challenges:
        progress = await _get_or_create_progress(db, user_id, ch.id)
        newly_done = await _update_progress(db, ch, progress, scenario, is_correct)
        if newly_done:
            completed.append({
                "challenge_id":      str(ch.id),
                "slug":              ch.slug,
                "name":              ch.name,
                "pack_scenario_bias": ch.pack_scenario_bias,
            })

    return completed


async def get_user_progress(db: AsyncSession, user_id: str) -> list[dict]:
    """Return all challenges with the user's current progress."""
    challenges = await _load_challenges(db)
    result = []
    for ch in challenges:
        p = await _get_or_create_progress(db, user_id, ch.id)
        result.append({
            "challenge_id":     str(ch.id),
            "slug":             ch.slug,
            "name":             ch.name,
            "description":      ch.description,
            "challenge_type":   ch.challenge_type,
            "target_value":     ch.target_value,
            "scenario_filter":  ch.scenario_filter,
            "current_progress": p.current_progress,
            "times_completed":  p.times_completed,
            "last_rewarded_at": p.last_rewarded_at.isoformat() if p.last_rewarded_at else None,
            "cooldown_hours":   ch.cooldown_hours,
            "on_cooldown":      _on_cooldown(p, ch.cooldown_hours),
        })
    return result


# ── Internals ─────────────────────────────────────────────────────────────────

async def _load_challenges(db: AsyncSession) -> list[QuestChallenge]:
    result = await db.execute(select(QuestChallenge))
    return result.scalars().all()


async def _get_or_create_progress(
    db: AsyncSession,
    user_id: str,
    challenge_id: uuid.UUID,
) -> UserChallengeProgress:
    result = await db.execute(
        select(UserChallengeProgress).where(
            and_(
                UserChallengeProgress.user_id == user_id,
                UserChallengeProgress.challenge_id == challenge_id,
            )
        )
    )
    p = result.scalar_one_or_none()
    if p is None:
        p = UserChallengeProgress(
            id=uuid.uuid4(),
            user_id=user_id,
            challenge_id=challenge_id,
            current_progress=0,
            times_completed=0,
            last_rewarded_at=None,
        )
        db.add(p)
        await db.flush()
    return p


async def _update_progress(
    db: AsyncSession,
    ch: QuestChallenge,
    progress: UserChallengeProgress,
    scenario: str,
    is_correct: bool,
) -> bool:
    """Update progress and return True if challenge just completed."""
    if ch.challenge_type == "streak":
        if is_correct:
            progress.current_progress += 1
        else:
            progress.current_progress = 0
            return False

    elif ch.challenge_type == "count_correct":
        if not is_correct:
            return False
        # Scenario filter: None means any scenario counts
        if ch.scenario_filter and ch.scenario_filter != scenario:
            return False
        progress.current_progress += 1

    else:
        return False

    # Check if threshold reached and cooldown passed
    if progress.current_progress >= ch.target_value:
        if not _on_cooldown(progress, ch.cooldown_hours):
            now = datetime.now(timezone.utc)
            progress.current_progress = 0
            progress.times_completed += 1
            progress.last_rewarded_at = now
            await db.flush()
            return True
        else:
            # Threshold hit but on cooldown — reset progress, no reward
            progress.current_progress = 0

    await db.flush()
    return False


def _on_cooldown(progress: UserChallengeProgress, cooldown_hours: int) -> bool:
    if progress.last_rewarded_at is None:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(hours=cooldown_hours)
    return progress.last_rewarded_at > cutoff

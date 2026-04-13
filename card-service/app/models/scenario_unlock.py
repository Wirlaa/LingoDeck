"""
ScenarioUnlock — tracks which scenarios a user has unlocked.

Progression (in order):
  cafe_order     → unlocked by default on first use
  asking_directions → unlocked by beating cafe_order big battle
  job_interview  → unlocked by beating asking_directions big battle
  kela_boss      → unlocked by beating job_interview big battle
"""
from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

SCENARIO_ORDER = ["cafe_order", "asking_directions", "job_interview", "kela_boss"]
DEFAULT_UNLOCK = "cafe_order"


def next_scenario(current: str) -> str | None:
    """Return the scenario that unlocks after beating 'current'. None if already at end."""
    try:
        idx = SCENARIO_ORDER.index(current)
        return SCENARIO_ORDER[idx + 1] if idx + 1 < len(SCENARIO_ORDER) else None
    except ValueError:
        return None


class ScenarioUnlock(Base):
    __tablename__ = "scenario_unlocks"
    __table_args__ = (
        UniqueConstraint("user_id", "scenario", name="uq_user_scenario"),
    )

    user_id:  Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    scenario: Mapped[str] = mapped_column(String(64),  nullable=False)

    def __repr__(self) -> str:
        return f"<ScenarioUnlock user={self.user_id} scenario={self.scenario}>"

"""Card routes — pack opening, collection, XP, battle eligibility."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.card import PackOpenRequest, CardXpRequest
from app.services import card_service

router = APIRouter(prefix="/cards", tags=["cards"])


@router.post("/open-pack")
async def open_pack(body: PackOpenRequest, db: AsyncSession = Depends(get_db)):
    """
    Open a card pack for a user.
    Returns PACK_SIZE card results (new cards or XP if duplicate).
    """
    await card_service.ensure_cafe_unlocked(db, body.user_id)
    cards = await card_service.open_pack(db, body.user_id, body.scenario_bias)
    return {"cards": cards, "pack_size": len(cards)}


@router.get("/collection/{user_id}")
async def get_collection(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get the user's full card collection with star levels and XP."""
    cards = await card_service.get_collection(db, user_id)
    return {"user_id": user_id, "cards": cards, "total": len(cards)}


@router.get("/collection/{user_id}/scenario/{scenario}")
async def get_collection_by_scenario(
    user_id: str,
    scenario: str,
    db: AsyncSession = Depends(get_db),
):
    """Get cards for a specific scenario — useful for deck building UI."""
    all_cards = await card_service.get_collection(db, user_id)
    scenario_cards = [c for c in all_cards if c["scenario"] == scenario]
    return {"user_id": user_id, "scenario": scenario, "cards": scenario_cards}


@router.post("/xp")
async def add_xp(body: CardXpRequest, db: AsyncSession = Depends(get_db)):
    """
    Add XP to a card. Called by game-backend after:
      - correct quest answer (xp=1)
      - correct battle answer (xp=2)
    Returns updated card info including whether a star-up occurred.
    """
    result = await card_service.add_xp(db, body.user_id, body.word_fi, body.xp)
    if result is None:
        return {"updated": False, "reason": "Card not found in collection"}
    return {"updated": True, **result}


@router.get("/battle-ready/{user_id}/{scenario}")
async def get_battle_deck(
    user_id: str,
    scenario: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if user can enter the big battle for a scenario.
    Returns eligible deck if they meet the requirement, or reason why not.
    """
    return await card_service.get_battle_deck(db, user_id, scenario)

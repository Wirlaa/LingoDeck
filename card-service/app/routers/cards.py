"""
Cards router.

POST /cards/open-pack → roll a pack and return cards to Node.js

Called by Node.js immediately after a quest submission where pack_awarded=True.
Node.js is responsible for saving the returned cards to the user's inventory.
This service only generates and returns them.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.card import CardOut, PackOpenRequest, PackOpenResult
from app.services.rarity_engine import PackCard, open_pack

router = APIRouter(prefix="/cards", tags=["cards"])


@router.post("/open-pack", response_model=PackOpenResult)
async def open_card_pack(
    body: PackOpenRequest,
    db: AsyncSession = Depends(get_db),
) -> PackOpenResult:
    """
    Roll a pack of cards.

    pack_score from the quest result controls rarity distribution:
      0.5-0.6  → mostly Common and Uncommon
      0.6-0.8  → mix of all rarities
      0.8-1.0  → higher chance of Rare, Epic, Legendary

    Cards are NOT saved here — Node.js handles inventory persistence.
    """
    try:
        pack: list[PackCard] = await open_pack(
            db,
            pack_score=body.pack_score,
            scenario_tags=body.scenario_tags,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not pack:
        raise HTTPException(
            status_code=404,
            detail="No language content available. Run quest-service /admin/seed first.",
        )

    cards_out = [
        CardOut(
            content_id=c.content_id,
            sentence_fi=c.sentence_fi,
            sentence_en=c.sentence_en,
            target_fi=c.target_fi,
            target_en=c.target_en,
            rarity=c.rarity,
            difficulty=c.difficulty,
            power=c.power,
            content_type=c.content_type,
        )
        for c in pack
    ]

    return PackOpenResult(
        pack_score=body.pack_score,
        cards=cards_out,
        legendary_pulled=any(c.rarity == "Legendary" for c in cards_out),
    )

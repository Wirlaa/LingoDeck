"""
Cards router.

One endpoint:
  POST /cards/open-pack  - roll a pack and return the cards

This is called by Node.js immediately after a challenge submission
where pack_awarded was True. Node passes back the pack_score from
the submission result and we use it to weight the rarity rolls.

Node.js is responsible for persisting the returned cards in its
own database as part of the user's inventory. The Python service
only generates and returns the card data.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.card import CardOut, PackOpenRequest, PackOpenResult
from app.services.rarity_engine import PackCard, open_pack

router = APIRouter(prefix="/cards", tags=["cards"])


# POST /cards/open-pack
@router.post("/open-pack", response_model=PackOpenResult)
async def open_card_pack(
    body: PackOpenRequest,
    db: AsyncSession = Depends(get_db),
) -> PackOpenResult:
    """
    Roll a pack of cards and return them.

    pack_score from the challenge submission controls rarity distribution:
      0.50 - 0.60  mostly Common and Uncommon
      0.60 - 0.80  mix of all rarities
      0.80 - 1.00  higher chance of Rare, Epic, Legendary

    The returned cards are NOT persisted here.
    Node.js receives them and saves them to the user's inventory.
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
            detail="No language content available. Run /admin/seed first.",
        )

    cards_out = [
        CardOut(
            content_id=card.content_id,
            sentence_fi=card.sentence_fi,
            sentence_en=card.sentence_en,
            target_fi=card.target_fi,
            target_en=card.target_en,
            rarity=card.rarity,
            difficulty=card.difficulty,
            power=card.power,
        )
        for card in pack
    ]

    legendary_pulled = any(c.rarity == "Legendary" for c in cards_out)

    return PackOpenResult(
        pack_score=body.pack_score,
        cards=cards_out,
        legendary_pulled=legendary_pulled,
    )

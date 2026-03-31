"""
Cards router — SKELETON.

One endpoint:
  POST /cards/open-pack  - roll a pack and return the cards

Called by Node.js immediately after:
  - A quest (challenge) submission where pack_awarded == True
  - A battle victory (Quiz Service tells Node.js how many bonus packs to open)

Node.js passes back the pack_score from the challenge submission result.
The rarity engine uses it to weight rolls toward rarer cards.

Node.js is responsible for persisting the returned cards in its own DB as
part of the user's inventory. This service only generates and returns card data.

TODO: implement open_card_pack() by wiring up rarity_engine.open_pack()
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.card import CardOut, PackOpenRequest, PackOpenResult

router = APIRouter(prefix="/cards", tags=["cards"])


@router.post("/open-pack", response_model=PackOpenResult)
async def open_card_pack(
    body: PackOpenRequest,
    db: AsyncSession = Depends(get_db),
) -> PackOpenResult:
    """
    Roll a pack of cards and return them.

    pack_score (0.0–1.0) controls rarity distribution:
      0.50–0.60  mostly Common and Uncommon
      0.60–0.80  mix of all rarities
      0.80–1.00  higher chance of Rare, Epic, Legendary

    Cards are NOT persisted here. Node.js receives them and saves
    them to the user's inventory in the Node.js DB.

    TODO:
      1. Call rarity_engine.open_pack(db, pack_score, scenario_tags)
      2. Raise HTTP 404 if open_pack returns an empty list (DB not seeded)
      3. Map each PackCard to a CardOut
      4. Set legendary_pulled = True if any card.rarity == "Legendary"
      5. Return PackOpenResult
    """
    # TODO: implement
    raise HTTPException(status_code=501, detail="Not implemented yet.")

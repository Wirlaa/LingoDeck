from fastapi import APIRouter
router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/health")
async def health():
    return {"status": "ok", "service": "challenge-service"}

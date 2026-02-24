from fastapi import APIRouter
import time

router = APIRouter()

START_TIME = time.time()

@router.get("/health")
async def health_check():
    return {
        "status":   "healthy",
        "uptime_s": round(time.time() - START_TIME, 1),
        "service":  "sudanese-heritage-ai",
    }

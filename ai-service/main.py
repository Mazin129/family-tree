"""
Sudanese Heritage Platform — AI/ML Microservice
================================================
FastAPI service providing:
  Phase 1: Duplicate detection, name similarity, relationship validation
  Phase 2: Lineage pattern analysis, tribe inference, migration visualization
  Phase 3: AI-generated narratives, heritage reports (requires LLM API)
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import os
from loguru import logger

from routers import duplicates, suggestions, lineage, narrative, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI Service starting up…")
    yield
    logger.info("✋ AI Service shutting down…")


app = FastAPI(
    title="Sudanese Heritage AI Service",
    description="AI/ML capabilities for the Sudanese Heritage Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── API Key Auth ─────────────────────────────────────────────────────────────
API_KEY = os.getenv("AI_SERVICE_API_KEY", "dev-key-change-in-production")

async def verify_api_key(x_api_key: str = Header(default="")):
    if os.getenv("ENVIRONMENT") != "development" and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(health.router,      prefix="/api/v1", tags=["health"])
app.include_router(duplicates.router,  prefix="/api/v1", tags=["phase-1"], dependencies=[Depends(verify_api_key)])
app.include_router(suggestions.router, prefix="/api/v1", tags=["phase-1"], dependencies=[Depends(verify_api_key)])
app.include_router(lineage.router,     prefix="/api/v1", tags=["phase-2"], dependencies=[Depends(verify_api_key)])
app.include_router(narrative.router,   prefix="/api/v1", tags=["phase-3"], dependencies=[Depends(verify_api_key)])

# ─── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service":     "Sudanese Heritage AI Service",
        "version":     "1.0.0",
        "status":      "operational",
        "phases":      {
            "phase_1": ["duplicate-detection", "name-similarity", "relationship-validation"],
            "phase_2": ["lineage-patterns", "tribe-inference", "migration-visualization"],
            "phase_3": ["narrative-generation", "heritage-reports"],
        },
    }

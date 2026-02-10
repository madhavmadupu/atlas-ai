"""Atlas-AI Engine — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, documents, health
from app.config import settings

# ── Logging ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("atlas-engine")


# ── Lifespan ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("=" * 60)
    logger.info("  Atlas-AI Engine v%s starting up", settings.api_version)
    logger.info("  Ollama: %s  │  Model: %s", settings.ollama_base_url, settings.llm_model)
    logger.info("  Embedding: %s", settings.embedding_model)
    logger.info("  ChromaDB: %s", settings.chroma_persist_dir)
    logger.info("=" * 60)

    # Ensure data directories exist
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    yield  # App runs here

    logger.info("Atlas-AI Engine shutting down")


# ── App ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(documents.router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — redirect to docs."""
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs",
        "health": "/api/health",
    }

"""Health and status API routes."""

import logging

from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse, ModelInfo, OllamaStatus
from app.services.llm_service import llm_service
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
    description="Returns system status including Ollama connection, GPU info, and ChromaDB state.",
)
async def health_check():
    """Check overall system health."""
    ollama_status = await llm_service.check_health()
    chroma_info = vector_store_service.get_collection_info()

    overall = "ok"
    if not ollama_status["connected"]:
        overall = "degraded"

    return HealthResponse(
        status=overall,
        ollama=OllamaStatus(**ollama_status),
        chroma_db=chroma_info,
        engine_version=settings.api_version,
    )


@router.get(
    "/models",
    response_model=list[ModelInfo],
    summary="List available models",
    description="Lists all models available in the local Ollama installation.",
)
async def list_models():
    """List available Ollama models."""
    models = await llm_service.list_models()
    return [ModelInfo(**m) for m in models]

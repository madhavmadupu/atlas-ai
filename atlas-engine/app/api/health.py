import logging
from fastapi import APIRouter
from app.config import get_settings
from app.schemas import HealthResponse, ModelConfig, ChromaStatus
from app.services.llm_service import llm_service
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Health"])

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
    description="Returns system status including loaded model info and ChromaDB state.",
)
async def health_check():
    """Check overall system health."""
    
    # Get model info
    try:
        model_info = llm_service.get_model_info()
        model_status = ModelConfig(
            model_name=model_info["model"],
            repo_id=model_info["repo_id"],
            gpu_layers=model_info["gpu_layers"],
            context_window=model_info["context_window"]
        )
        llm_ok = True
    except Exception as e:
        logger.error(f"LLM Health Check failed: {e}")
        llm_ok = False
        model_status = ModelConfig(
            model_name="error",
            repo_id="error",
            gpu_layers=0,
            context_window=0
        )

    # Get Chroma info
    chroma_data = vector_store_service.get_collection_info()
    chroma_status = ChromaStatus(
        status=chroma_data.get("status", "unknown"),
        persist_dir=str(chroma_data.get("persist_dir", "")),
        collections=chroma_data.get("collections", 0),
        total_documents=chroma_data.get("total_documents", 0)
    )

    overall = "ok" if (llm_ok and chroma_status.status == "connected") else "degraded"

    return HealthResponse(
        status=overall,
        model=model_status,
        chroma_db=chroma_status,
        engine_version="0.2.0 (GGUF)"
    )

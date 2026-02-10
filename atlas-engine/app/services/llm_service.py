"""Ollama LLM service — handles chat generation with GPU/CPU auto-detection."""

import logging
from collections.abc import AsyncIterator

import httpx
from langchain_ollama import ChatOllama

from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Wrapper around Ollama for LLM inference."""

    def __init__(self) -> None:
        self._llm: ChatOllama | None = None
        self._streaming_llm: ChatOllama | None = None

    def _get_llm(self, streaming: bool = False) -> ChatOllama:
        """Lazy-initialize the LLM client."""
        if streaming:
            if self._streaming_llm is None:
                self._streaming_llm = ChatOllama(
                    model=settings.llm_model,
                    base_url=settings.ollama_base_url,
                    streaming=True,
                    temperature=0.7,
                )
            return self._streaming_llm

        if self._llm is None:
            self._llm = ChatOllama(
                model=settings.llm_model,
                base_url=settings.ollama_base_url,
                streaming=False,
                temperature=0.7,
            )
        return self._llm

    # ── Health & GPU info ────────────────────────────────────────────────

    async def check_health(self) -> dict:
        """Check Ollama server health and GPU availability."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]

            gpu_info = await self._get_gpu_info()

            return {
                "connected": True,
                "base_url": settings.ollama_base_url,
                "models": models,
                "gpu_available": gpu_info["available"],
                "gpu_info": gpu_info["info"],
            }
        except Exception as exc:
            logger.warning("Ollama health check failed: %s", exc)
            return {
                "connected": False,
                "base_url": settings.ollama_base_url,
                "models": [],
                "gpu_available": False,
                "gpu_info": None,
            }

    async def _get_gpu_info(self) -> dict:
        """Query Ollama for GPU information via the running model."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/show",
                    json={"name": settings.llm_model},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    details = data.get("details", {})
                    # Ollama exposes GPU usage info in model details
                    return {
                        "available": True,
                        "info": f"Model: {settings.llm_model}, "
                                f"Family: {details.get('family', 'unknown')}, "
                                f"Parameters: {details.get('parameter_size', 'unknown')}, "
                                f"Quantization: {details.get('quantization_level', 'unknown')}",
                    }
        except Exception:
            pass
        return {"available": False, "info": None}

    async def list_models(self) -> list[dict]:
        """List all available Ollama models."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [
                    {
                        "name": m["name"],
                        "size": self._format_size(m.get("size", 0)),
                        "modified_at": m.get("modified_at"),
                    }
                    for m in data.get("models", [])
                ]
        except Exception as exc:
            logger.warning("Failed to list models: %s", exc)
            return []

    # ── Generation ───────────────────────────────────────────────────────

    async def generate(self, prompt: str) -> str:
        """Generate a non-streaming response."""
        llm = self._get_llm(streaming=False)
        response = await llm.ainvoke(prompt)
        return response.content

    async def generate_stream(self, prompt: str) -> AsyncIterator[str]:
        """Generate a streaming response, yielding tokens."""
        llm = self._get_llm(streaming=True)
        async for chunk in llm.astream(prompt):
            if chunk.content:
                yield chunk.content

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """Format bytes to human-readable size."""
        for unit in ("B", "KB", "MB", "GB"):
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"


# Singleton instance
llm_service = LLMService()

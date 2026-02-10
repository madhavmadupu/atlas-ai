"""Embedding service using Ollama embeddings."""

import logging

from langchain_ollama import OllamaEmbeddings

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates vector embeddings via Ollama."""

    def __init__(self) -> None:
        self._embeddings: OllamaEmbeddings | None = None

    @property
    def embeddings(self) -> OllamaEmbeddings:
        """Lazy-initialize the embeddings model."""
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                model=settings.embedding_model,
                base_url=settings.ollama_base_url,
            )
        return self._embeddings

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of document texts."""
        return await self.embeddings.aembed_documents(texts)

    async def embed_query(self, text: str) -> list[float]:
        """Embed a single query text."""
        return await self.embeddings.aembed_query(text)


# Singleton instance
embedding_service = EmbeddingService()

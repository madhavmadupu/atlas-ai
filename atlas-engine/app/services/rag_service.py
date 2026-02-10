"""RAG service — retrieval-augmented generation orchestration."""

import logging
from collections.abc import AsyncIterator

from app.config import settings
from app.services.llm_service import llm_service
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are Atlas-AI, a helpful and precise AI assistant.
Answer the user's question using ONLY the provided context below.
If the context doesn't contain enough information to answer, say so clearly.
Always cite which source documents you used in your answer.

Context:
{context}
"""

PLAIN_SYSTEM_PROMPT = """You are Atlas-AI, a helpful, accurate, and friendly AI assistant.
You are running fully locally on the user's device. Be concise but thorough in your answers."""


class RAGService:
    """Orchestrates retrieval-augmented generation."""

    async def chat(self, message: str, stream: bool = True) -> str | AsyncIterator[str]:
        """Plain chat without RAG context."""
        prompt = f"{PLAIN_SYSTEM_PROMPT}\n\nUser: {message}\n\nAssistant:"

        if stream:
            return llm_service.generate_stream(prompt)
        return await llm_service.generate(prompt)

    async def chat_with_rag(
        self,
        message: str,
        collection_name: str | None = None,
        stream: bool = True,
    ) -> tuple[str | AsyncIterator[str], list[dict]]:
        """Chat with RAG context from the vector store.

        Returns (response, sources) tuple.
        """
        # Retrieve relevant documents
        sources = vector_store_service.similarity_search(
            query=message,
            collection_name=collection_name,
            k=settings.rag_top_k,
        )

        if not sources:
            logger.info("No relevant documents found for query, falling back to plain chat")
            response = await self.chat(message, stream=stream)
            return response, []

        # Build context from retrieved chunks
        context_parts = []
        for i, src in enumerate(sources, 1):
            filename = src["metadata"].get("filename", "unknown")
            context_parts.append(
                f"[Source {i}: {filename}]\n{src['content']}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # Build augmented prompt
        system = RAG_SYSTEM_PROMPT.format(context=context)
        prompt = f"{system}\n\nUser: {message}\n\nAssistant:"

        # Format sources for response
        clean_sources = [
            {
                "filename": s["metadata"].get("filename", "unknown"),
                "chunk_index": s["metadata"].get("chunk_index", 0),
                "score": round(s["score"], 3),
                "preview": s["content"][:200] + "..." if len(s["content"]) > 200 else s["content"],
            }
            for s in sources
        ]

        if stream:
            return llm_service.generate_stream(prompt), clean_sources
        response = await llm_service.generate(prompt)
        return response, clean_sources


# Singleton instance
rag_service = RAGService()

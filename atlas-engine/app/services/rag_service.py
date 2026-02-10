
import logging
from typing import AsyncGenerator, List, Dict, Any, Tuple

from app.config import get_settings
from app.services.llm_service import llm_service
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)

# System prompts
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
    def __init__(self):
        self.settings = get_settings()

    async def chat(self, message: str, stream: bool = True) -> Any:
        """Plain chat without RAG context."""
        messages = [
            {"role": "system", "content": PLAIN_SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ]

        if stream:
            return llm_service.chat_stream(messages)
        return await llm_service.chat(messages)

    async def chat_with_rag(
        self,
        message: str,
        collection_name: str | None = None,
        stream: bool = True,
    ) -> Tuple[Any, List[Dict[str, Any]]]:
        """Chat with RAG context."""
        
        # 1. Retrieve
        docs = vector_store_service.similarity_search(
            query=message,
            collection_name=collection_name,
            k=self.settings.SEARCH_K
        )

        sources = []
        if not docs:
            logger.info("No relevant docs found, using plain chat")
            return await self.chat(message, stream), sources

        # 2. Build Context
        context_parts = []
        for i, doc in enumerate(docs, 1):
            filename = doc["metadata"].get("filename", "unknown")
            # Create a clean source object
            sources.append({
                "filename": filename,
                "chunk_index": doc["metadata"].get("chunk_index", 0),
                "score": doc.get("score", 0),
                "preview": doc["content"][:200]
            })
            context_parts.append(f"[Source {i} ({filename})]:\n{doc['content']}")
        
        context_str = "\n\n".join(context_parts)

        # 3. Construct Augmented Prompt
        system_msg = RAG_SYSTEM_PROMPT.format(context=context_str)
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": message}
        ]

        # 4. Generate
        if stream:
            return llm_service.chat_stream(messages), sources
        
        response = await llm_service.chat(messages)
        return response, sources

# Singleton
rag_service = RAGService()

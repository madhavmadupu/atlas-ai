"""ChromaDB vector store service — persistent local storage."""

import logging
from pathlib import Path

import chromadb
from langchain_chroma import Chroma

from app.config import settings
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Manages ChromaDB collections for document storage and retrieval."""

    def __init__(self) -> None:
        self._client: chromadb.ClientAPI | None = None
        self._stores: dict[str, Chroma] = {}

    @property
    def client(self) -> chromadb.ClientAPI:
        """Lazy-initialize the persistent ChromaDB client."""
        if self._client is None:
            persist_dir = Path(settings.chroma_persist_dir)
            persist_dir.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(persist_dir))
            logger.info("ChromaDB initialized at %s", persist_dir)
        return self._client

    def get_store(self, collection_name: str | None = None) -> Chroma:
        """Get or create a LangChain Chroma wrapper for a collection."""
        name = collection_name or settings.chroma_collection_name

        if name not in self._stores:
            self._stores[name] = Chroma(
                client=self.client,
                collection_name=name,
                embedding_function=embedding_service,
            )
        return self._stores[name]

    # ── Collection management ────────────────────────────────────────────

    def list_collections(self) -> list[dict]:
        """List all collections with document counts."""
        collections = self.client.list_collections()
        result = []
        for name in collections:
            try:
                col = self.client.get_collection(name)
                result.append({"name": name, "count": col.count()})
            except Exception:
                result.append({"name": name, "count": 0})
        return result

    def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection."""
        try:
            self.client.delete_collection(collection_name)
            self._stores.pop(collection_name, None)
            logger.info("Deleted collection: %s", collection_name)
            return True
        except Exception as exc:
            logger.error("Failed to delete collection %s: %s", collection_name, exc)
            return False

    def get_collection_info(self) -> dict:
        """Get summary info about ChromaDB state."""
        try:
            collections = self.list_collections()
            total_docs = sum(c["count"] for c in collections)
            return {
                "status": "connected",
                "persist_dir": settings.chroma_persist_dir,
                "collections": len(collections),
                "total_documents": total_docs,
            }
        except Exception as exc:
            return {"status": "error", "error": str(exc)}

    # ── Search ───────────────────────────────────────────────────────────

    def similarity_search(
        self,
        query: str,
        collection_name: str | None = None,
        k: int | None = None,
    ) -> list[dict]:
        """Search for similar documents and return with scores."""
        store = self.get_store(collection_name)
        top_k = k or settings.rag_top_k

        results = store.similarity_search_with_relevance_scores(query, k=top_k)

        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": score,
            }
            for doc, score in results
            if score >= settings.rag_score_threshold
        ]


# Singleton instance
vector_store_service = VectorStoreService()

"""Document ingestion pipeline — chunking, embedding, and indexing."""

import logging
import uuid
from pathlib import Path

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)

# Supported file extensions → loader class
LOADER_MAP = {
    ".txt": TextLoader,
    ".md": UnstructuredMarkdownLoader,
    ".pdf": PyPDFLoader,
}


class IngestionService:
    """Processes documents: load → chunk → embed → store."""

    def __init__(self) -> None:
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    async def ingest_file(
        self,
        file_path: str,
        filename: str,
        collection_name: str | None = None,
    ) -> dict:
        """Ingest a single file into the vector store.

        Returns metadata about the ingested document.
        """
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix not in LOADER_MAP:
            raise ValueError(
                f"Unsupported file type: {suffix}. "
                f"Supported: {', '.join(LOADER_MAP.keys())}"
            )

        # Load document
        loader_cls = LOADER_MAP[suffix]
        loader = loader_cls(str(path))
        raw_docs = loader.load()

        # Split into chunks
        chunks = self._splitter.split_documents(raw_docs)

        # Add metadata
        doc_id = str(uuid.uuid4())
        for i, chunk in enumerate(chunks):
            chunk.metadata.update({
                "doc_id": doc_id,
                "filename": filename,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "source": str(path),
            })

        # Store in vector database
        col_name = collection_name or settings.chroma_collection_name
        store = vector_store_service.get_store(col_name)
        store.add_documents(chunks)

        logger.info(
            "Ingested '%s' → %d chunks into collection '%s'",
            filename, len(chunks), col_name,
        )

        return {
            "doc_id": doc_id,
            "filename": filename,
            "chunk_count": len(chunks),
            "collection_name": col_name,
        }

    def list_documents(self, collection_name: str | None = None) -> list[dict]:
        """List all ingested documents by querying unique doc_ids from metadata."""
        col_name = collection_name or settings.chroma_collection_name

        try:
            store = vector_store_service.get_store(col_name)
            # Get all documents from the collection
            collection = vector_store_service.client.get_collection(col_name)
            result = collection.get(include=["metadatas"])

            # Group by doc_id
            docs: dict[str, dict] = {}
            for meta in result.get("metadatas", []):
                if meta is None:
                    continue
                did = meta.get("doc_id", "unknown")
                if did not in docs:
                    docs[did] = {
                        "doc_id": did,
                        "filename": meta.get("filename", "unknown"),
                        "chunk_count": meta.get("total_chunks", 0),
                        "collection_name": col_name,
                    }
            return list(docs.values())
        except Exception:
            return []

    def delete_document(self, doc_id: str, collection_name: str | None = None) -> bool:
        """Delete all chunks belonging to a document."""
        col_name = collection_name or settings.chroma_collection_name

        try:
            collection = vector_store_service.client.get_collection(col_name)
            # Find all chunk IDs with this doc_id
            result = collection.get(
                where={"doc_id": doc_id},
                include=["metadatas"],
            )
            if result["ids"]:
                collection.delete(ids=result["ids"])
                logger.info("Deleted document %s (%d chunks)", doc_id, len(result["ids"]))
                return True
            return False
        except Exception as exc:
            logger.error("Failed to delete document %s: %s", doc_id, exc)
            return False


# Singleton instance
ingestion_service = IngestionService()

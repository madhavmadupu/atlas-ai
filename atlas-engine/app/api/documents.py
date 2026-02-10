"""Document management API routes."""

import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.config import settings
from app.schemas import (
    CollectionListResponse,
    DocumentInfo,
    DocumentListResponse,
)
from app.services.ingestion_service import ingestion_service
from app.services.vector_store import vector_store_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf"}


@router.post(
    "/upload",
    response_model=DocumentInfo,
    summary="Upload and ingest a document",
    description="Upload a file (.txt, .md, .pdf) to be chunked, embedded, and indexed.",
)
async def upload_document(
    file: UploadFile,
    collection_name: str | None = None,
):
    """Upload a document for RAG ingestion."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Save uploaded file to disk
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename

    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Ingest the document
        result = await ingestion_service.ingest_file(
            file_path=str(file_path),
            filename=file.filename,
            collection_name=collection_name,
        )

        return DocumentInfo(**result)

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Upload failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}")


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List ingested documents",
)
async def list_documents(collection_name: str | None = None):
    """List all ingested documents in a collection."""
    docs = ingestion_service.list_documents(collection_name)
    return DocumentListResponse(documents=docs, total=len(docs))


@router.delete(
    "/{doc_id}",
    summary="Delete a document",
)
async def delete_document(doc_id: str, collection_name: str | None = None):
    """Delete a document and all its chunks from the vector store."""
    success = ingestion_service.delete_document(doc_id, collection_name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return {"status": "deleted", "doc_id": doc_id}


@router.get(
    "/collections",
    response_model=CollectionListResponse,
    summary="List all collections",
)
async def list_collections():
    """List all ChromaDB collections."""
    collections = vector_store_service.list_collections()
    return CollectionListResponse(collections=collections)


@router.delete(
    "/collections/{collection_name}",
    summary="Delete a collection",
)
async def delete_collection(collection_name: str):
    """Delete an entire ChromaDB collection."""
    success = vector_store_service.delete_collection(collection_name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
    return {"status": "deleted", "collection": collection_name}

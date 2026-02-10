"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, Field


# ── Chat ─────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Incoming chat message."""
    message: str = Field(..., min_length=1, description="User message text")
    collection_name: str | None = Field(
        None, description="ChromaDB collection for RAG context (omit for plain chat)"
    )
    stream: bool = Field(True, description="Whether to stream the response")


class ChatResponse(BaseModel):
    """Non-streaming chat response."""
    response: str = Field(..., description="Assistant response text")
    sources: list[dict] | None = Field(
        None, description="Source documents used for RAG"
    )


class ChatStreamChunk(BaseModel):
    """A single chunk in a streamed response."""
    token: str = Field(..., description="Token text")
    done: bool = Field(False, description="Whether this is the final chunk")
    sources: list[dict] | None = None


# ── Documents ────────────────────────────────────────────────────────────

class DocumentInfo(BaseModel):
    """Metadata about an ingested document."""
    doc_id: str
    filename: str
    chunk_count: int
    collection_name: str


class DocumentListResponse(BaseModel):
    """List of ingested documents."""
    documents: list[DocumentInfo]
    total: int


class CollectionInfo(BaseModel):
    """Info about a ChromaDB collection."""
    name: str
    count: int


class CollectionListResponse(BaseModel):
    """List of collections."""
    collections: list[CollectionInfo]


# ── Health ───────────────────────────────────────────────────────────────

class OllamaStatus(BaseModel):
    """Ollama connection status."""
    connected: bool
    base_url: str
    models: list[str] = []
    gpu_available: bool = False
    gpu_info: str | None = None


class HealthResponse(BaseModel):
    """System health status."""
    status: str = Field("ok", description="Overall status")
    ollama: OllamaStatus
    chroma_db: dict
    engine_version: str


class ModelInfo(BaseModel):
    """Available model information."""
    name: str
    size: str | None = None
    modified_at: str | None = None

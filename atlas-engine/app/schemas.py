from typing import Any, List, Optional
from pydantic import BaseModel, Field

# --- Chat Models ---

class ChatRequest(BaseModel):
    message: str
    collection_name: Optional[str] = None
    stream: bool = True

class Source(BaseModel):
    filename: str
    chunk_index: int
    score: float
    preview: str

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[Source]] = None

# --- Document Models ---

class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    chunk_count: int
    collection_name: str

class DocumentListResponse(BaseModel):
    documents: List[DocumentInfo]
    total: int

class CollectionInfo(BaseModel):
    name: str
    count: int

class CollectionListResponse(BaseModel):
    collections: List[CollectionInfo]

# --- Health Models ---

class ModelConfig(BaseModel):
    model_name: str
    repo_id: str
    gpu_layers: int
    context_window: int

class ChromaStatus(BaseModel):
    status: str
    persist_dir: str
    collections: int
    total_documents: int

class HealthResponse(BaseModel):
    status: str
    model: ModelConfig
    chroma_db: ChromaStatus
    engine_version: str = "0.2.0 (GGUF)"

from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    # App Config
    app_name: str = "Atlas-AI Engine"
    api_v1_str: str = "/api"
    api_version: str = "0.2.0"
    
    # Model Configuration (GGUF & HuggingFace)
    llm_repo_id: str = "TheBloke/Llama-2-7b-Chat-GGUF"
    llm_filename: str = "llama-2-7b-chat.Q4_K_M.gguf"
    llm_context_window: int = 4096
    llm_gpu_layers: int = -1  # -1 = auto/all to GPU if possible
    
    # Embedding Model (SentenceTransformers)
    embedding_model_id: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Paths
    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    model_cache_dir: Path = data_dir / "models"
    chroma_persist_dir: Path = data_dir / "chroma_db"
    upload_dir: Path = data_dir / "uploads"
    chroma_collection_name: str = "atlas_docs" # Restored missing field

    # RAG Settings
    chunk_size: int = 1000
    chunk_overlap: int = 200
    search_k: int = 4
    rag_score_threshold: float = 0.0 # Restored
    rag_top_k: int = 4 # Restored alias for search_k

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

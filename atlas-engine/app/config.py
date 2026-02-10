from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "Atlas-AI Engine"
    API_V1_STR: str = "/api"
    
    # Model Configuration (GGUF & HuggingFace)
    LLM_REPO_ID: str = "TheBloke/Llama-2-7b-Chat-GGUF"
    LLM_FILENAME: str = "llama-2-7b-chat.Q4_K_M.gguf"
    LLM_CONTEXT_WINDOW: int = 4096
    LLM_GPU_LAYERS: int = -1  # -1 = auto/all to GPU if possible
    
    # Embedding Model (SentenceTransformers)
    EMBEDDING_MODEL_ID: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    MODEL_CACHE_DIR: Path = DATA_DIR / "models"
    CHROMA_PERSIST_DIR: Path = DATA_DIR / "chroma_db"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"

    # RAG Settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    SEARCH_K: int = 4  # Number of documents to retrieve

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

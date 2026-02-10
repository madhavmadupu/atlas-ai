"""Central configuration using pydantic-settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — override via environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Ollama ──────────────────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"

    # ── ChromaDB ────────────────────────────────────────────────────────
    chroma_persist_dir: str = str(Path(__file__).resolve().parent.parent / "data" / "chroma_db")
    chroma_collection_name: str = "atlas_documents"

    # ── Document Processing ─────────────────────────────────────────────
    chunk_size: int = 1000
    chunk_overlap: int = 200
    upload_dir: str = str(Path(__file__).resolve().parent.parent / "data" / "uploads")

    # ── API ──────────────────────────────────────────────────────────────
    api_title: str = "Atlas-AI Engine"
    api_version: str = "0.1.0"
    api_description: str = "Fully local AI backend with RAG capabilities"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # ── RAG ──────────────────────────────────────────────────────────────
    rag_top_k: int = 5
    rag_score_threshold: float = 0.3


settings = Settings()

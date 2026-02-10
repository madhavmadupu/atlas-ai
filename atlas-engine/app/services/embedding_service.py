from langchain_core.embeddings import Embeddings
from sentence_transformers import SentenceTransformer
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

class EmbeddingService(Embeddings):
    """
    Embedding service using local SentenceTransformers model.
    Compatible with LangChain's Embeddings interface.
    """
    _instance = None
    _model = None

    def __init__(self):
        self.settings = get_settings()
        self._load_model()

    def _load_model(self):
        if EmbeddingService._model is None:
            logger.info(f"Loading embedding model: {self.settings.EMBEDDING_MODEL_ID}")
            # Ensure model directory exists
            self.settings.MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
            
            EmbeddingService._model = SentenceTransformer(
                self.settings.EMBEDDING_MODEL_ID,
                cache_folder=str(self.settings.MODEL_CACHE_DIR),
                device="cpu", # Default to CPU to save VRAM
            )
            logger.info("Embedding model loaded successfully.")

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts."""
        embeddings = EmbeddingService._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""
        return embedding.tolist()


# Singleton instance
embedding_service = EmbeddingService()

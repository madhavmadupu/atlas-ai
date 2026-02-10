import logging
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from pathlib import Path
from llama_cpp import Llama
from huggingface_hub import hf_hub_download
from app.config import get_settings

logger = logging.getLogger(__name__)

class LLMService:
    _model: Optional[Llama] = None

    def __init__(self):
        self.settings = get_settings()
        self._ensure_model_loaded()

    def _ensure_model_loaded(self):
        if LLMService._model is not None:
            return

        # Ensure directory exists
        self.settings.model_cache_dir.mkdir(parents=True, exist_ok=True)
        
        model_path = self.settings.model_cache_dir / self.settings.llm_filename
        
        # Download if missing
        if not model_path.exists():
            logger.info(f"⬇️ Downloading GGUF model: {self.settings.llm_filename} from {self.settings.llm_repo_id}...")
            try:
                hf_hub_download(
                    repo_id=self.settings.llm_repo_id,
                    filename=self.settings.llm_filename,
                    local_dir=str(self.settings.model_cache_dir),
                    local_dir_use_symlinks=False
                )
                logger.info("✅ Download complete.")
            except Exception as e:
                logger.error(f"❌ Failed to download model: {e}")
                raise

        # Load model
        logger.info(f"🧠 Loading Llama model from {model_path} (GPU Layers: {self.settings.llm_gpu_layers})...")
        try:
            LLMService._model = Llama(
                model_path=str(model_path),
                n_gpu_layers=self.settings.llm_gpu_layers,
                n_ctx=self.settings.llm_context_window,
                verbose=False
            )
            logger.info("✅ Model loaded successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to load Llama model: {e}")
            raise

    async def chat_stream(self, messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """
        Stream chat completion tokens.
        """
        if LLMService._model is None:
            raise RuntimeError("Model not loaded")

        # Create generator in thread to avoid blocking event loop?
        # Ideally yes, but for simplicity we iterate.
        # Note: llama-cpp-python releases GIL during inference, so this might be OK?
        # Actually generator iteration happens in python.
        
        stream = LLMService._model.create_chat_completion(
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=2048 # Reasonable limit
        )

        for chunk in stream:
            delta = chunk['choices'][0]['delta']
            if 'content' in delta:
                yield delta['content']
                # Yield control to event loop to allow other tasks (like heartbeats)
                await asyncio.sleep(0)

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        """
        Non-streaming chat completion.
        """
        if LLMService._model is None:
            raise RuntimeError("Model not loaded")

        response = await asyncio.to_thread(
            LLMService._model.create_chat_completion,
            messages=messages,
            stream=False,
            temperature=0.7
        )
        return response['choices'][0]['message']['content']

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model": self.settings.llm_filename,
            "repo_id": self.settings.llm_repo_id,
            "gpu_layers": self.settings.llm_gpu_layers,
            "context_window": self.settings.llm_context_window
        }


# Singleton instance
llm_service = LLMService()

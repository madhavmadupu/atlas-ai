"""Chat API routes — plain chat and RAG-augmented chat."""

import json
import logging

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.schemas import ChatRequest, ChatResponse
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    summary="Send a chat message",
    description="Send a message to the AI. If `collection_name` is provided, RAG context is used.",
)
async def chat(request: ChatRequest):
    """Handle chat requests — plain or with RAG."""
    try:
        if request.collection_name:
            # RAG-augmented chat
            if request.stream:
                return EventSourceResponse(
                    _stream_rag(request.message, request.collection_name),
                    media_type="text/event-stream",
                )
            response, sources = await rag_service.chat_with_rag(
                message=request.message,
                collection_name=request.collection_name,
                stream=False,
            )
            return ChatResponse(response=response, sources=sources)
        else:
            # Plain chat
            if request.stream:
                return EventSourceResponse(
                    _stream_plain(request.message),
                    media_type="text/event-stream",
                )
            response = await rag_service.chat(
                message=request.message,
                stream=False,
            )
            return ChatResponse(response=response, sources=None)

    except Exception as exc:
        logger.error("Chat error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


async def _stream_plain(message: str):
    """Generator for streaming plain chat via SSE."""
    try:
        stream = await rag_service.chat(message, stream=True)
        async for token in stream:
            yield json.dumps({"token": token, "done": False})
        yield json.dumps({"token": "", "done": True, "sources": None})
    except Exception as exc:
        yield json.dumps({"error": str(exc), "done": True})


async def _stream_rag(message: str, collection_name: str):
    """Generator for streaming RAG chat via SSE."""
    try:
        stream, sources = await rag_service.chat_with_rag(
            message=message,
            collection_name=collection_name,
            stream=True,
        )
        async for token in stream:
            yield json.dumps({"token": token, "done": False})
        yield json.dumps({"token": "", "done": True, "sources": sources})
    except Exception as exc:
        yield json.dumps({"error": str(exc), "done": True})

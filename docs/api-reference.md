# API Reference

Base URL: `http://localhost:8000`

See full Swagger UI at `/docs` for interactive testing.

## Chat

### `POST /api/chat`
Send a message.

**Body:**
```json
{
  "message": "Hello world",
  "collection_name": "optional_collection_name",
  "stream": true
}
```

**Response (Streaming):**
Server-Sent Events (SSE) stream returning JSON chunks:
```json
{"token": "Hello", "done": false}
...
{"token": "", "done": true, "sources": [...]}
```

---

## Documents

### `POST /api/documents/upload`
Upload a file for ingestion.

**Form Data:** `file` (Binary)

### `GET /api/documents`
List all ingested documents.

### `DELETE /api/documents/{doc_id}`
Delete a document and its vectors.

---

## Health

### `GET /api/health`
Check system status.

**Response:**
```json
{
  "status": "ok",
  "ollama": {
    "connected": true,
    "gpu_available": true,
    "models": ["llama3.2"]
  },
  "chroma_db": { ... }
}
```

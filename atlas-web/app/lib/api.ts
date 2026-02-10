/**
 * Atlas-AI API Client
 */

const API_BASE_URL = "http://localhost:8000/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export interface Source {
  filename: string;
  chunk_index: number;
  score: number;
  preview: string;
}

export interface DocumentInfo {
  doc_id: string;
  filename: string;
  chunk_count: number;
  collection_name: string;
}

export interface HealthStatus {
  status: string;
  ollama: {
    connected: boolean;
    models: string[];
    gpu_available: boolean;
    gpu_info: string | null;
  };
  chroma_db: {
    status: string;
    collections: number;
    total_documents: number;
  };
}

/**
 * Check system health.
 */
export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

/**
 * Upload a document for ingestion.
 */
export async function uploadDocument(file: File): Promise<DocumentInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

/**
 * List all ingested documents.
 */
export async function listDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_BASE_URL}/documents`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents;
}

/**
 * Delete a document.
 */
export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

/**
 * Chat with the AI (streaming).
 * Returns an EventSource for handling the stream.
 */
export function chatStream(message: string, collectionName?: string | null): EventSource {
  const body = {
    message,
    collection_name: collectionName || null,
    stream: true,
  };

  // Use fetch-based streaming or SSE?
  // Our backend uses sse-starlette, so we can use standard fetch with ReadableStream
  // But EventSource is GET only usually, or requires special handling for POST.
  // The sse-starlette EventSourceResponse works with standard HTTP requests.
  // However, standard EventSource API in browser doesn't support POST bodies easily.
  // We'll use fetch with a ReadableStream reader for better control.

  throw new Error("Use chatStreamFetch instead");
}

/**
 * Chat with streaming via fetch + ReadableStream.
 * Yields tokens as they arrive.
 */
export async function* chatStreamFetch(
  message: string,
  collectionName?: string | null
): AsyncGenerator<{ token: string; sources?: Source[] }, void, unknown> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      collection_name: collectionName || null,
      stream: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat error: ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    // Process SSE lines
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.slice(6);
        if (dataStr === "[DONE]") continue;

        try {
          const data = JSON.parse(dataStr);
          if (data.error) throw new Error(data.error);

          if (data.token) {
            yield { token: data.token };
          }

          if (data.done && data.sources) {
            yield { token: "", sources: data.sources };
          }
        } catch (e) {
          console.error("Failed to parse SSE data", e);
        }
      }
    }
  }
}

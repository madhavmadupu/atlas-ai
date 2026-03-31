const OLLAMA_BASE = "http://localhost:11434";

export interface OllamaChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaChatChunk {
  model: string;
  message?: { role: string; content: string };
  done: boolean;
}

export class OllamaService {
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels() {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error("Failed to list models");
    const data: any = await res.json();
    return data.models ?? [];
  }

  async *chatStream(params: {
    model: string;
    messages: OllamaChatMessage[];
  }): AsyncGenerator<OllamaChatChunk> {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat error: ${res.status} ${text}`);
    }

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as OllamaChatChunk;
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async *pullModel(
    name: string,
  ): AsyncGenerator<{ status: string; completed?: number; total?: number }> {
    const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
    });

    if (!res.ok) {
      throw new Error(`Failed to pull model: ${res.status}`);
    }

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line);
        } catch {
          // skip
        }
      }
    }
  }

  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${OLLAMA_BASE}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      throw new Error(`Failed to delete model: ${res.status}`);
    }
  }

  async generateTitle(
    model: string,
    userMessage: string,
  ): Promise<string> {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: `Generate a very short title (3-6 words, no quotes) for a conversation that starts with: "${userMessage.slice(0, 200)}"`,
          stream: false,
        }),
      });
      if (!res.ok) return "New Conversation";
      const data: any = await res.json();
      return (data.response ?? "New Conversation").trim().slice(0, 50);
    } catch {
      return "New Conversation";
    }
  }
}

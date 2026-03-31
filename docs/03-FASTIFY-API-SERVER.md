# Atlas AI — Local API Server (Fastify)

## Overview

The Fastify server is the **bridge between everything**. It runs inside the Electron main process (spawned as a separate server but within the same Node runtime), listens on port 3001, and is bound to `0.0.0.0` so that both the local Next.js UI and mobile devices on the LAN can reach it.

**Port:** `3001`  
**Binding:** `0.0.0.0` (all interfaces)  
**Ollama:** proxied from `http://localhost:11434`

---

## `server/index.ts` — Server Entry

```typescript
import Fastify from 'fastify';
import { chatRoutes } from './routes/chat.routes';
import { modelsRoutes } from './routes/models.routes';
import { healthRoutes } from './routes/health.routes';
import { pairingRoutes } from './routes/pairing.routes';
import { corsPlugin } from './plugins/cors.plugin';
import { networkInterfaces } from 'os';

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

export async function startFastifyServer({
  port = 3001,
  host = '0.0.0.0',
}: {
  port?: number;
  host?: string;
}) {
  // Register plugins
  await server.register(corsPlugin);

  // Register route modules
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(chatRoutes, { prefix: '/api' });
  await server.register(modelsRoutes, { prefix: '/api' });
  await server.register(pairingRoutes, { prefix: '/api' });

  // Start listening
  await server.listen({ port, host });

  const lanIP = getLanIP();
  console.log(`[Atlas Server] Listening on http://localhost:${port}`);
  if (lanIP) {
    console.log(`[Atlas Server] LAN access: http://${lanIP}:${port}`);
  }

  return server;
}

export async function stopFastifyServer() {
  await server.close();
}

// Get the machine's LAN IP (for mobile pairing)
export function getLanIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}
```

---

## `server/plugins/cors.plugin.ts`

```typescript
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    // Allow any origin — all requests are local anyway
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control'],
  });
});
```

---

## `server/routes/chat.routes.ts` — Core Chat with Streaming

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OllamaService } from '../services/ollama.service';
import { ConversationService } from '../services/conversation.service';
import type { ChatRequest, ChatMessage } from '@atlas/shared/types';

export async function chatRoutes(fastify: FastifyInstance) {
  const ollama = new OllamaService();
  const conversations = new ConversationService();

  // POST /api/chat — streaming chat endpoint
  fastify.post<{ Body: ChatRequest }>(
    '/chat',
    {
      schema: {
        body: {
          type: 'object',
          required: ['messages', 'model'],
          properties: {
            conversationId: { type: 'string' },
            model: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                },
              },
            },
            systemPrompt: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatRequest }>, reply: FastifyReply) => {
      const { messages, model, conversationId, systemPrompt } = request.body;

      // Set SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      reply.raw.flushHeaders();

      // Build messages array with optional system prompt
      const fullMessages: ChatMessage[] = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages,
      ];

      let fullResponse = '';

      try {
        // Stream from Ollama
        const stream = await ollama.chatStream({ model, messages: fullMessages });

        for await (const chunk of stream) {
          if (chunk.done) {
            // Final chunk — save to DB and send done event
            if (conversationId) {
              await conversations.appendAssistantMessage(conversationId, fullResponse);
            }
            reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            break;
          }

          const token = chunk.message?.content ?? '';
          fullResponse += token;

          // Send token as SSE event
          reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      } finally {
        reply.raw.end();
      }

      return reply;
    },
  );

  // GET /api/conversations — list all conversations
  fastify.get('/conversations', async () => {
    return conversations.listAll();
  });

  // GET /api/conversations/:id — get conversation with messages
  fastify.get<{ Params: { id: string } }>(
    '/conversations/:id',
    async (request) => {
      return conversations.getWithMessages(request.params.id);
    },
  );

  // POST /api/conversations — create new conversation
  fastify.post<{ Body: { title?: string; model: string } }>(
    '/conversations',
    async (request) => {
      return conversations.create(request.body);
    },
  );

  // DELETE /api/conversations/:id
  fastify.delete<{ Params: { id: string } }>(
    '/conversations/:id',
    async (request) => {
      conversations.delete(request.params.id);
      return { success: true };
    },
  );
}
```

---

## `server/routes/models.routes.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { OllamaService } from '../services/ollama.service';

export async function modelsRoutes(fastify: FastifyInstance) {
  const ollama = new OllamaService();

  // GET /api/models — list installed models
  fastify.get('/models', async () => {
    return ollama.listModels();
  });

  // POST /api/models/pull — pull a model with SSE progress
  fastify.post<{ Body: { name: string } }>(
    '/models/pull',
    async (request, reply) => {
      const { name } = request.body;

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.flushHeaders();

      try {
        for await (const progress of ollama.pullModel(name)) {
          reply.raw.write(`data: ${JSON.stringify(progress)}\n\n`);
          if (progress.status === 'success') break;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Pull failed';
        reply.raw.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      } finally {
        reply.raw.end();
      }

      return reply;
    },
  );

  // DELETE /api/models/:name
  fastify.delete<{ Params: { name: string } }>(
    '/models/:name',
    async (request) => {
      await ollama.deleteModel(request.params.name);
      return { success: true };
    },
  );
}
```

---

## `server/routes/health.routes.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { getLanIP } from '../index';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health ping — mobile uses this to verify connection
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      app: 'atlas-ai',
      version: '1.0.0',
      lanIP: getLanIP(),
      timestamp: Date.now(),
    };
  });

  // Ollama health check
  fastify.get('/health/ollama', async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(3000),
      });
      return { status: res.ok ? 'running' : 'error', code: res.status };
    } catch {
      return { status: 'offline' };
    }
  });
}
```

---

## `server/routes/pairing.routes.ts` — Mobile Pairing

```typescript
import { FastifyInstance } from 'fastify';
import { getLanIP } from '../index';
import crypto from 'crypto';

// Simple in-memory pairing tokens (cleared on restart)
const activePairingTokens = new Map<string, { createdAt: number }>();

export async function pairingRoutes(fastify: FastifyInstance) {
  // Desktop generates a QR code token
  fastify.get('/pairing/token', async () => {
    const token = crypto.randomBytes(16).toString('hex');
    activePairingTokens.set(token, { createdAt: Date.now() });

    // Clean up tokens older than 5 minutes
    for (const [t, meta] of activePairingTokens.entries()) {
      if (Date.now() - meta.createdAt > 5 * 60 * 1000) {
        activePairingTokens.delete(t);
      }
    }

    return {
      token,
      lanIP: getLanIP(),
      port: 3001,
      // Mobile encodes this as a QR code
      connectionString: `atlas://connect?ip=${getLanIP()}&port=3001&token=${token}`,
    };
  });

  // Mobile verifies the token (called after QR scan)
  fastify.post<{ Body: { token: string } }>('/pairing/verify', async (request, reply) => {
    const { token } = request.body;

    if (!activePairingTokens.has(token)) {
      return reply.status(401).send({ error: 'Invalid or expired pairing token' });
    }

    // Token consumed
    activePairingTokens.delete(token);

    return {
      success: true,
      lanIP: getLanIP(),
      port: 3001,
    };
  });
}
```

---

## `server/services/ollama.service.ts` — Ollama Client

```typescript
import type { ChatMessage, OllamaChatChunk, OllamaModel, PullProgress } from '@atlas/shared/types';

const OLLAMA_BASE = 'http://localhost:11434';

export class OllamaService {
  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error('Ollama is not running');
    const data = await res.json();
    return data.models ?? [];
  }

  async *chatStream(params: {
    model: string;
    messages: ChatMessage[];
  }): AsyncGenerator<OllamaChatChunk> {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as OllamaChatChunk;
          yield chunk;
          if (chunk.done) return;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }

  async *pullModel(name: string): AsyncGenerator<PullProgress> {
    const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: true }),
    });

    if (!res.ok) throw new Error(`Failed to pull ${name}`);

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as PullProgress;
        } catch {
          // Skip
        }
      }
    }
  }

  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${OLLAMA_BASE}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Failed to delete ${name}`);
  }

  async generateTitle(model: string, userMessage: string): Promise<string> {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `Generate a short 4-6 word title for a conversation that starts with: "${userMessage.slice(0, 200)}". Reply with ONLY the title, no quotes, no punctuation at end.`,
        stream: false,
      }),
    });
    const data = await res.json();
    return data.response?.trim() ?? 'New Conversation';
  }
}
```

---

## `server/services/conversation.service.ts`

```typescript
import { getDb } from '@atlas/db';
import { nanoid } from 'nanoid';
import type { Conversation, Message } from '@atlas/shared/types';

export class ConversationService {
  private db = getDb();

  listAll(): Conversation[] {
    return this.db.conversations.findMany({ orderBy: 'updatedAt', direction: 'desc' });
  }

  getWithMessages(id: string): Conversation & { messages: Message[] } {
    const conversation = this.db.conversations.findById(id);
    if (!conversation) throw new Error('Conversation not found');
    const messages = this.db.messages.findByConversationId(id);
    return { ...conversation, messages };
  }

  create({ title, model }: { title?: string; model: string }): Conversation {
    const id = nanoid();
    const now = new Date().toISOString();
    return this.db.conversations.create({
      id,
      title: title ?? 'New Conversation',
      model,
      createdAt: now,
      updatedAt: now,
    });
  }

  appendAssistantMessage(conversationId: string, content: string): Message {
    const id = nanoid();
    const now = new Date().toISOString();
    const message = this.db.messages.create({
      id,
      conversationId,
      role: 'assistant',
      content,
      createdAt: now,
    });
    this.db.conversations.update(conversationId, { updatedAt: now });
    return message;
  }

  appendUserMessage(conversationId: string, content: string): Message {
    const id = nanoid();
    const now = new Date().toISOString();
    return this.db.messages.create({
      id,
      conversationId,
      role: 'user',
      content,
      createdAt: now,
    });
  }

  delete(id: string): void {
    this.db.messages.deleteByConversationId(id);
    this.db.conversations.delete(id);
  }
}
```

---

## `apps/desktop/package.json`

```json
{
  "name": "desktop",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron .\"",
    "build": "next build && electron-builder",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "@atlas/shared": "workspace:*",
    "@atlas/db": "workspace:*",
    "@fastify/cors": "^9.0.0",
    "fastify": "^4.28.0",
    "fastify-plugin": "^4.5.1",
    "nanoid": "^5.0.0",
    "next": "14.2.0",
    "pino-pretty": "^11.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "better-sqlite3": "^11.0.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0"
  },
  "devDependencies": {
    "electron": "^32.0.0",
    "electron-builder": "^24.9.0",
    "concurrently": "^9.0.0",
    "wait-on": "^8.0.0",
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```
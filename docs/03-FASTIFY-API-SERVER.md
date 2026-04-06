# Atlas AI — Local API Server (Fastify)

The Fastify server is the shared backend for:

- the desktop UI (renderer), via `http://localhost:3001`
- the mobile app in `desktop` provider mode, via `http://<LAN-IP>:3001`

It also serves the exported desktop UI as static files when started from Electron.

## Where it lives

- Entry: `atlas-desktop/server/index.ts`
- Routes: `atlas-desktop/server/routes/*.ts`
- Persistence: `atlas-desktop/server/db.ts`
- Ollama integration: `atlas-desktop/server/services/ollama.service.ts`
- Memory/RAG service: `atlas-desktop/server/services/memory.service.ts`

## Runtime configuration

- Port: `3001`
- Host: `0.0.0.0` (LAN accessible)
- CORS: permissive (local/LAN use)
- Ollama base URL: `http://localhost:11434`

## API surface (current)

All routes are prefixed with `/api`.

### Health

- `GET /api/health` → `{ status, app, version, lanIP, timestamp }`
- `GET /api/health/ollama` → `{ status: "running" | "offline" }`

### Conversations

- `GET /api/conversations` → desktop conversation list
- `GET /api/conversations/:id` → `{ ...conversation, messages: [...] }`
- `POST /api/conversations` → `{ success: true, id }`
- `DELETE /api/conversations/:id` → `{ success: true }`

### Chat (streaming via SSE)

- `POST /api/chat` → SSE stream of tokens

Request body:

```json
{
  "conversationId": "optional",
  "model": "ollama-model-name",
  "messages": [{ "role": "user|assistant|system", "content": "..." }],
  "systemPrompt": "optional"
}
```

SSE events (`data:` lines) are JSON objects:

- `{ "token": "..." }` — incremental token chunks
- `{ "done": true }` — stream finished
- `{ "error": "..." }` — error (stream ends after this)

Persistence behavior:

- On each request, the final user message is appended to SQLite (if `conversationId` is provided).
- When the stream completes, the final assistant message is appended to SQLite.
- On the first assistant message, the server may generate and set a conversation title.

### Models (Ollama)

- `GET /api/models` → list installed models
- `POST /api/models/pull` → SSE progress stream
- `DELETE /api/models/:name` → delete model

### Settings

- `GET /api/settings` → `{ [key: string]: string }`
- `GET /api/settings/:key` → `{ key, value }`
- `POST /api/settings` → `{ success: true }`

### Memories (RAG)

- `GET /api/memories` → list all (optionally `?category=preference|fact|interest|personality|context`)
- `GET /api/memories/search?q=...` → keyword search across stored memories
- `POST /api/memories` → manually create a memory (`{ category, content, keywords? }`)
- `PUT /api/memories/:id` → update content/keywords/confidence
- `DELETE /api/memories/:id` → delete a memory

Memories are also created automatically during chat — after each response, the LLM extracts user facts in the background. See `docs/14-MEMORY-RAG.md` for the full architecture.

## Notes for mobile

Only the `desktop` provider uses this server.

- Expo Go can exercise the mobile `desktop` provider.
- The mobile `local` provider bypasses Fastify entirely (it uses `llama.rn`).

## Testing the API manually

These are useful for quick sanity checks while developing.

### Health

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/ollama
```

### Models

```bash
curl http://localhost:3001/api/models
```

### Conversations

```bash
curl http://localhost:3001/api/conversations
curl http://localhost:3001/api/conversations/<id>
```

### Chat streaming

SSE is easiest to observe with `curl -N`:

```bash
curl -N http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"Say hi in one sentence."}]}'
```

### Memories

```bash
curl http://localhost:3001/api/memories
curl http://localhost:3001/api/memories?category=preference
curl http://localhost:3001/api/memories/search?q=python+programming
```

## How to add a new endpoint

1. Implement a route module in `atlas-desktop/server/routes/`.
2. Register it in `atlas-desktop/server/index.ts` (under the `/api` prefix).
3. If it touches persistence, use helpers from `atlas-desktop/server/db.ts`.
4. Update types in:
   - `atlas-desktop/atlas-web/lib/types.ts` (desktop UI)
   - `atlas-mobile/lib/types.ts` (mobile, if used)

## Related docs

- Desktop shell: `docs/02-ELECTRON-DESKTOP.md`
- Desktop UI: `docs/06-DESKTOP-UI.md`
- Desktop DB: `docs/04-DATABASE.md`
- Mobile providers: `docs/07-MOBILE-APP.md`

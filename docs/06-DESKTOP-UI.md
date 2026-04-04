# Atlas AI — Desktop UI (Next.js)

The desktop UI lives in `atlas-desktop/atlas-web/` and is rendered inside Electron.

At runtime, Electron loads the UI from the Fastify server (`http://localhost:3001`). In production, Fastify serves a static Next.js export from `atlas-desktop/atlas-web/out/`.

## Directory map

- Routing + layout: `atlas-desktop/atlas-web/app/*`
- UI components:
  - `atlas-desktop/atlas-web/components/layout/*`
  - `atlas-desktop/atlas-web/components/chat/*`
- Client state (Zustand):
  - `atlas-desktop/atlas-web/store/chat.store.ts`
  - `atlas-desktop/atlas-web/store/models.store.ts`
  - `atlas-desktop/atlas-web/store/settings.store.ts`
- Streaming hook: `atlas-desktop/atlas-web/hooks/useStreamingResponse.ts`
- Shared UI types: `atlas-desktop/atlas-web/lib/types.ts`

## Core screens & shell

### `atlas-desktop/atlas-web/app/layout.tsx`

- global HTML/body styling
- dark-first layout

### `atlas-desktop/atlas-web/app/page.tsx`

Wraps the main UI shell and chat window:

- `AppShell` for sidebar/title bar
- `ChatWindow` for chat content and composer

### `atlas-desktop/atlas-web/app/models/page.tsx`

- desktop model list (Ollama)
- pull model progress (SSE)
- delete models

### `atlas-desktop/atlas-web/app/settings/page.tsx`

- default model selection
- system prompt
- UX toggles (streaming, token count, setup state)

## Chat flow (high level)

1. User types a prompt in `MessageInput`.
2. The chat store appends the user message locally.
3. `useStreamingResponse` calls `POST /api/chat` against Fastify.
4. The UI streams assistant tokens as they arrive (SSE).
5. On completion, the server persists messages into SQLite.

Files involved:

- `atlas-desktop/atlas-web/components/chat/ChatWindow.tsx`
- `atlas-desktop/atlas-web/components/chat/MessageInput.tsx`
- `atlas-desktop/atlas-web/hooks/useStreamingResponse.ts`
- `atlas-desktop/server/routes/chat.ts`

## Static export + routing

In production, the desktop UI is exported to static HTML and served by Fastify.

- Export output folder: `atlas-desktop/atlas-web/out/`
- Fastify serves static files and provides SPA-like fallbacks for routes.

The implication:

- you can’t rely on a Next.js “server” at runtime
- all runtime data must come from Fastify `/api/*`

## Conversation list

The sidebar drives navigation by selecting a conversation and loading its messages from the server.

- `atlas-desktop/atlas-web/components/layout/Sidebar.tsx`
- `atlas-desktop/atlas-web/store/chat.store.ts`
- `atlas-desktop/server/routes/conversations.ts`

## Model selection

The desktop UI lists Ollama models and allows pulling new ones.

- `atlas-desktop/atlas-web/components/chat/ModelSelector.tsx`
- `atlas-desktop/atlas-web/store/models.store.ts`
- `atlas-desktop/server/routes/models.ts`
- `atlas-desktop/server/services/ollama.service.ts`

## Practical tips when editing UI

- Treat stores (`store/*.ts`) as the source of truth for state transitions.
- Keep `useStreamingResponse` responsible for SSE parsing and cancellation.
- Keep UI components mostly “dumb” (render + callbacks) to avoid coupling.

## Related docs

- Electron shell: `docs/02-ELECTRON-DESKTOP.md`
- API server: `docs/03-FASTIFY-API-SERVER.md`
- SQLite: `docs/04-DATABASE.md`

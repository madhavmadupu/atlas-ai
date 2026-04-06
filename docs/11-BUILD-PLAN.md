# Atlas AI — Build Plan / Status

This doc is a module-by-module checklist of what exists today and what the next high-impact milestones are.

## Desktop (`atlas-desktop/`)

### Electron shell

Status: implemented baseline.

- Starts Ollama (or detects an existing Ollama) — `atlas-desktop/electron/sidecar.ts`
- Starts Fastify and loads UI from `http://localhost:3001` — `atlas-desktop/electron/main.ts`
- Exposes a minimal IPC bridge — `atlas-desktop/electron/preload.ts`

Next:

- Add system tray controls (optional)
- Improve error surfaces when Ollama is missing/offline

### Fastify API

Status: implemented baseline.

- Health, chat (SSE), conversations, models, settings, memories — `atlas-desktop/server/routes/*`
- Memory/RAG service extracts user facts after each chat turn and augments future prompts — `atlas-desktop/server/services/memory.service.ts`

Next:

- Add request validation schemas (so mobile errors are cleaner)
- Add pagination for conversation lists if needed

### SQLite persistence

Status: implemented baseline.

- Schema and query helpers in one file — `atlas-desktop/server/db.ts`
- Includes `user_memories` table for RAG-based personalization

Next:

- Add lightweight migration/versioning once schema stabilizes

### Desktop UI (Next.js)

Status: implemented baseline.

- App shell + chat window + sidebar + model selector — `atlas-desktop/atlas-web/components/*`

Next:

- Add message actions (copy/regenerate/edit) similar to mobile
- Markdown/code rendering parity with mobile

## Mobile (`atlas-mobile/`)

### Provider split

Status: implemented.

- `desktop`: talks to Fastify over LAN
- `local`: runs GGUF on-device via `llama.rn`

Next:

- Add a hard Expo Go guard: disable `local` provider and show a clear CTA to install the dev build

### Chat UI shell

Status: implemented (ChatGPT-style).

- Top bar (safe-area aware) + sidebar + model picker + composer — `atlas-mobile/components/chat/*`

Next:

- Better markdown/code block rendering
- Attachments entry points (optional)

### Local GGUF model management

Status: implemented baseline.

- Import/download/delete/select model — `atlas-mobile/app/models.tsx`
- Validation blocks non-chat GGUFs — `atlas-mobile/lib/model-validation.ts`

Next:

- Download resume + checksum (optional)
- Storage/quota UX for large GGUFs

### Local persistence

Status: implemented baseline.

- Local conversations/messages stored in AsyncStorage — `atlas-mobile/store/chat.store.ts`
- Local user memories stored in AsyncStorage — `atlas-mobile/lib/memory-storage.ts`

Next:

- Consider SQLite if AsyncStorage becomes a bottleneck

### Memory / RAG

Status: implemented.

- Desktop: keyword-based memory extraction and retrieval via Ollama — `atlas-desktop/server/services/memory.service.ts`
- Mobile (local): same approach via `llama.rn` — `atlas-mobile/lib/memory-service.ts`
- Full CRUD API at `/api/memories` — `atlas-desktop/server/routes/memory.ts`
- See `docs/14-MEMORY-RAG.md` for full architecture

Next:

- Consider vector/embedding-based retrieval for better semantic matching
- Add memory management UI (view/edit/delete memories)
- Explore cross-device memory sync between desktop and mobile

## Cross-cutting

### Type drift

Status: known.

Types are duplicated between desktop and mobile (no shared package). See:

- `docs/05-SHARED-TYPES.md`

Next:

- Extract a small shared API contract module (optional)

# Atlas AI — AI IDE Rules

## Instructions for Cursor, Windsurf, and other Agentic IDEs

This file lives at `.cursorrules` and/or `.windsurfrules` in the repo root.

---

## Project Identity

You are helping build **Atlas AI** — a completely offline, privacy-first AI chatbot. It runs local LLMs via Ollama on a desktop app (Electron + Next.js) and connects a mobile app (Expo + React Native) over Wi-Fi. Zero cloud. Zero telemetry. Zero external API calls.

## Critical Rules — Never Violate

1. **NEVER add external API calls** — no OpenAI, no Anthropic, no cloud services of any kind. All AI goes through local Ollama at `http://localhost:11434`.
2. **NEVER add analytics or telemetry** — no Sentry, no Mixpanel, no PostHog, no Amplitude.
3. **NEVER store data outside the device** — all persistence is SQLite via better-sqlite3. No Firebase, no Supabase, no cloud DB.
4. **TypeScript strict mode everywhere** — no `any` type without an explanatory comment. No `@ts-ignore` without explanation.
5. **SSE for streaming, not WebSockets** — all streaming uses Server-Sent Events (`text/event-stream`).
6. **IPC security** — renderer process never has `nodeIntegration: true`. All Node access goes through the contextBridge preload.

## Architecture Reference

```
apps/desktop/
  electron/        → Electron main process (Node.js, owns: Ollama, SQLite, IPC, tray)
  src/             → Next.js app (renderer, owns: all UI)
  server/          → Fastify HTTP server (port 3001, owns: API for UI + mobile)

apps/mobile/
  app/             → Expo Router screens
  components/      → React Native components
  store/           → Zustand stores (connection, chat)

packages/
  shared/          → Types, constants, utilities (no dependencies)
  db/              → SQLite queries (better-sqlite3)
```

## Code Style

- **TypeScript** everywhere. No JavaScript files.
- **Functional components** with hooks. No class components.
- **Named exports** preferred over default exports (except Next.js pages and Expo screens which must be default).
- **Zustand** for all client state — no Redux, no Context for global state.
- **No prop drilling** beyond 2 levels — use Zustand.
- **Tailwind CSS** for all styling on desktop (Next.js). **NativeWind** for mobile (React Native).
- **shadcn/ui** for desktop UI components — do not create custom versions of things shadcn already provides.
- File names: `PascalCase.tsx` for components, `camelCase.ts` for utils/hooks/stores.

## When Adding a New Feature

1. Define types in `packages/shared/src/types/` first
2. Add DB queries to `packages/db/src/queries/` if persistence is needed
3. Add Fastify route to `apps/desktop/server/routes/`
4. Add Zustand store or update existing one
5. Build the UI component
6. Wire up the page

## Common Patterns

### Streaming SSE in Next.js (fetching from Fastify)

```typescript
const response = await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, messages }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value, { stream: true });
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    if (event.token) handleToken(event.token);
    if (event.done) handleDone();
  }
}
```

### Fastify SSE Route

```typescript
fastify.post('/something', async (request, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders();

  reply.raw.write(`data: ${JSON.stringify({ token: 'hello' })}\n\n`);
  reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  reply.raw.end();
  return reply;
});
```

### SQLite Query Pattern

```typescript
// Always use prepared statements
const findById = db.prepare<[string], MyType>('SELECT * FROM table WHERE id = ?');
const result = findById.get(id) as MyType | undefined;
```

### Zustand Store Pattern

```typescript
interface MyStore {
  data: string[];
  isLoading: boolean;
  loadData: () => Promise<void>;
}

export const useMyStore = create<MyStore>((set) => ({
  data: [],
  isLoading: false,
  loadData: async () => {
    set({ isLoading: true });
    const res = await fetch('http://localhost:3001/api/data');
    const data = await res.json();
    set({ data, isLoading: false });
  },
}));
```

## Port Reference

| Service | Port | Who uses it |
|---|---|---|
| Next.js dev server | 3000 | Electron renderer (dev only) |
| Fastify API server | 3001 | Next.js UI + Mobile app |
| Ollama | 11434 | Fastify server only |

## Important: Electron IPC vs HTTP

- **Prefer HTTP to Fastify** for data operations — both the desktop UI and mobile use the same API
- **Use IPC only** for things that only the desktop needs and can't go over HTTP:
  - Checking app version (`system:getInfo`)
  - Triggering model pulls with native progress UI
  - System-level things (opening file dialogs, etc.)

## File Creation Conventions

When creating a new route file:
- Desktop API route: `apps/desktop/server/routes/[name].routes.ts`
- Next.js page: `apps/desktop/src/app/[path]/page.tsx`
- Expo screen: `apps/mobile/app/[path].tsx` or `apps/mobile/app/[path]/index.tsx`
- Shared type: `packages/shared/src/types/[name].types.ts`
- DB queries: `packages/db/src/queries/[name].queries.ts`
- Component: `apps/[app]/components/[category]/[Name].tsx`
- Hook: `apps/[app]/hooks/use[Name].ts`
- Store: `apps/[app]/store/[name].store.ts`

## Do Not

- Do not create `.js` files (TypeScript only)
- Do not use `require()` — use ES module `import`
- Do not use `var` — use `const` and `let`
- Do not write raw SQL in components — always go through `packages/db` query functions
- Do not call Ollama directly from the Next.js renderer — go through Fastify
- Do not add new npm packages without checking if the functionality already exists in the codebase
- Do not use `console.log` in production paths — use the Fastify logger or structured logging
- Do not hardcode IPs or ports — always use constants from `@atlas/shared/constants`
- Do not use `any` type for Ollama API responses — they're all typed in `@atlas/shared/types`

## Testing Approach

- No unit test framework is set up in v1.0 — test manually
- Each feature should have a manual test scenario documented in a comment
- Integration tests via `curl` scripts for Fastify routes
- End-to-end tests: document manual steps for each user flow

## Dependency Policy

**Allowed to add:**
- UI libraries that work offline (Radix UI, Lucide icons, react-markdown)
- Expo plugins for native functionality
- Build tools (types packages, linters)

**Not allowed:**
- Any package that makes network requests to external servers at runtime
- Any analytics, logging, or error tracking service
- Any package that requires an API key

## Error Handling Pattern

```typescript
// In Fastify routes
try {
  const result = await someOperation();
  return result;
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  reply.status(500).send({ error: message });
}

// In React components/hooks
try {
  await someOperation();
} catch (err) {
  console.error('Operation failed:', err);
  // Show error to user via toast or inline error state
  setError(err instanceof Error ? err.message : 'Something went wrong');
}
```
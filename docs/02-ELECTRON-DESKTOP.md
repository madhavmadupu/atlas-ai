# Atlas AI — Electron Desktop App

This doc explains the desktop “shell” layer: Electron main process + preload bridge + Ollama sidecar manager.

## What Electron is responsible for

Electron owns the parts that must be native:

- Window lifecycle (create/minimize/maximize/close)
- Loading the desktop UI inside Chromium
- Starting/stopping the model runtime (Ollama) when needed
- Starting/stopping the local API server (Fastify)
- Exposing a safe IPC bridge for window/system actions

## Process model (at runtime)

The desktop app runs three things together:

1. Electron main process (`atlas-desktop/electron/main.ts`)
2. Fastify server (`atlas-desktop/server/index.ts`) on `:3001`
3. Ollama runtime on `:11434` (system install or bundled)

The renderer (Next.js UI) talks to Fastify via HTTP:

- `http://localhost:3001` for desktop UI calls
- `http://<LAN-IP>:3001` for mobile “desktop provider” calls

## Key files

### `atlas-desktop/electron/main.ts`

Responsibilities:

- starts Ollama via `startOllamaSidecar()`
- starts Fastify via `startServer({ port: 3001, host: "0.0.0.0", staticDir })`
- creates a `BrowserWindow` and loads `http://localhost:3001`
- registers minimal IPC for window controls + system info

Design choice: the UI is served by Fastify (static Next.js export), so Electron always points at one URL (`:3001`) instead of juggling dev/prod URLs.

### `atlas-desktop/electron/sidecar.ts`

Responsibilities:

- detects whether Ollama is already running (`pingOllama()`)
- finds an Ollama binary:
  - system `PATH` (preferred)
  - common Windows install paths
  - bundled resources path (for packaged distribution)
- spawns `ollama serve` if needed

### `atlas-desktop/electron/preload.ts`

Responsibilities:

- exposes a narrow `window.electronAPI` surface to the renderer
- avoids `nodeIntegration` in the renderer (security)

## Startup lifecycle (step-by-step)

When the app boots:

1. Electron `app.whenReady()` triggers `bootstrap()`.
2. `startOllamaSidecar()`:
   - checks if `http://localhost:11434` is already alive
   - if not, finds an Ollama binary and spawns `ollama serve`
3. Electron starts Fastify on `0.0.0.0:3001`.
4. Electron creates a `BrowserWindow` and loads `http://localhost:3001`.
5. Renderer starts fetching from `/api/*` for models, chats, settings, and conversations.

Shutdown:

- `before-quit` should stop Fastify and stop the Ollama sidecar (if we spawned it).

## Common tasks

### Changing ports

- API/UI port is currently hard-coded to `3001` in `atlas-desktop/electron/main.ts`.
- Ollama is assumed at `11434` in `atlas-desktop/server/services/ollama.service.ts` and `atlas-desktop/electron/sidecar.ts`.

If you change ports, update docs and the mobile defaults (mobile `desktop` provider expects the Fastify port).

### Making something available to mobile (LAN)

Rule of thumb:

- If the mobile `desktop` provider needs it, it should be an HTTP route in Fastify.
- Don’t add “mobile-only” side channels (WebSockets, IPC) unless there’s a hard requirement.

## Debugging tips

- Electron main logs show up in the terminal that launched the desktop app.
- Fastify logs show up in the same place (it runs in the same Node runtime).
- Renderer debugging uses Chromium devtools (in dev builds).

## Security constraints

- Keep `contextIsolation: true`.
- Keep `nodeIntegration: false`.
- Expose only a narrow `contextBridge` API surface from preload.

## Related docs

- API: `docs/03-FASTIFY-API-SERVER.md`
- Desktop UI: `docs/06-DESKTOP-UI.md`
- Persistence: `docs/04-DATABASE.md`

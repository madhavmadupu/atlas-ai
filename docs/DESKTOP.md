# Atlas AI — Desktop (Summary)

The desktop app is the “LAN brain” of Atlas AI. It runs:

- Ollama model runtime (local on the machine)
- a Fastify HTTP/SSE API on `:3001`
- a Next.js UI rendered inside Electron
- SQLite persistence (`atlas.db`)

The mobile app can connect to the desktop API over Wi‑Fi LAN in `desktop` provider mode.

## Directory map

- Electron shell: `atlas-desktop/electron/*`
- Fastify + SQLite: `atlas-desktop/server/*`
- Next.js UI: `atlas-desktop/atlas-web/*`

## Key runtime ports

- `3001`: Fastify API + static UI
- `11434`: Ollama (local only)

## How the desktop pieces fit together

1. Electron starts (main process).
2. Electron ensures Ollama is running (or starts it).
3. Electron starts Fastify on `0.0.0.0:3001`.
4. Fastify serves:
   - `/api/*` (chat, conversations, models, settings)
   - the exported Next.js UI at `/`
5. Electron loads `http://localhost:3001` into a BrowserWindow.

## What to read next

- Electron details: `docs/02-ELECTRON-DESKTOP.md`
- API details: `docs/03-FASTIFY-API-SERVER.md`
- DB details: `docs/04-DATABASE.md`
- UI details: `docs/06-DESKTOP-UI.md`

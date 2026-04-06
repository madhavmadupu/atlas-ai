# Atlas AI — Project Overview

Atlas AI is an offline-first assistant with two apps that can operate independently:

- `atlas-desktop/`: runs models via Ollama and exposes a local LAN API.
- `atlas-mobile/`: can either connect to the desktop (LAN) or run a GGUF fully offline on-device.

This project intentionally avoids:

- cloud inference APIs
- telemetry/analytics
- accounts

## Modules (what lives where)

```text
atlas-ai/
├── atlas-desktop/
│   ├── atlas-web/        # Next.js renderer UI (desktop)
│   ├── electron/         # Electron main/preload + Ollama sidecar manager
│   └── server/           # Fastify API + SQLite persistence
├── atlas-mobile/
│   ├── app/              # Expo Router screens
│   ├── components/       # Mobile UI components (ChatGPT-like shell)
│   ├── hooks/            # Streaming hooks (desktop vs local)
│   ├── lib/              # API, llama engine, storage, validation
│   ├── store/            # Zustand stores (connection/chat/model)
│   └── android/          # Generated native project after `expo prebuild`
└── docs/
```

## How data flows

### Desktop app (Electron + Fastify + SQLite + Ollama)

At runtime:

- Electron starts Ollama (or connects to an already-running Ollama).
- Fastify listens on `:3001` and exposes:
  - API routes under `/api/*`
  - the desktop UI as static files (Next.js export)
- SQLite stores conversations/messages/settings/memories on the desktop.
- After each chat response, the memory service extracts user facts in the background and stores them for future retrieval (see `docs/14-MEMORY-RAG.md`).

The desktop UI (renderer) talks to Fastify via HTTP (`http://localhost:3001`).

### Mobile app providers

The mobile app has a provider split. The UI stays the same, but the backend changes.

#### Provider: `desktop` (LAN)

- Reads/writes conversations through the desktop API.
- Streams tokens from `POST /api/chat` (SSE).
- Works in Expo Go (useful for UI iteration).

#### Provider: `local` (on-device, offline)

- Runs a GGUF model in-process via `llama.rn` (native `llama.cpp`).
- Persists chats/settings/memories on the phone (AsyncStorage).
- Extracts and stores user memories locally for personalized responses.
- Stores GGUF files in the app sandbox (Expo FileSystem).
- Requires a dev build or release build (Expo Go cannot load native modules).

## Key constraints (non-negotiable)

- Expo Go can preview UI and the `desktop` provider, but can never run the `local` provider.
- Local chat must use chat/instruct GGUFs. Embedding/reranker/mmproj files are rejected.

## Where to read next

- Desktop: `docs/DESKTOP.md`, then `docs/02-ELECTRON-DESKTOP.md` + `docs/03-FASTIFY-API-SERVER.md`
- Mobile: `docs/MOBILE.md`, then `docs/07-MOBILE-APP.md` + `docs/08-MODEL-MANAGEMENT.md`

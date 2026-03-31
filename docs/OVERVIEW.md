# Atlas AI — Project Overview

## What is Atlas AI?

Atlas AI is a **completely offline, privacy-first AI chatbot** that runs entirely on the user's own hardware. No data ever leaves the device. No cloud. No accounts. No telemetry.

It has two surfaces:
1. **Desktop app** — Electron + Next.js. This is the "brain" — it bundles and runs the local LLM via Ollama, exposes a local API, and has its own full chat UI.
2. **Mobile app** — Expo + React Native. This is the "client" — a polished mobile chat interface that connects to the desktop over Wi-Fi LAN. It does NOT run any model locally.

## Core Principles (never violate these)

1. **Zero network calls** — No request ever goes to an external server. No analytics, no crash reporting, no model telemetry. The only network traffic is local LAN between desktop and phone.
2. **No accounts** — Users never sign in to anything.
3. **No cloud storage** — Everything is stored on-device in SQLite.
4. **One-click setup** — User downloads the desktop app, clicks "Download Model", waits, then starts chatting. Nothing else required.
5. **Streaming responses** — All LLM responses stream token by token via SSE (Server-Sent Events).

## Repository Structure

This is a **Turborepo monorepo**.

```
atlas-ai/
├── apps/
│   ├── desktop/          # Electron + Next.js desktop app
│   └── mobile/           # Expo + React Native mobile app
├── packages/
│   ├── shared/           # Shared types, utilities, constants
│   ├── ui/               # Shared React Native + web UI components (NativeWind)
│   └── db/               # SQLite schema, migrations, query helpers
├── turbo.json
├── package.json
└── .cursor/              # Cursor IDE rules
```

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop shell | Electron 32 | Cross-platform: Windows, macOS, Linux |
| Desktop UI | Next.js 14 (App Router) | Served inside Electron BrowserWindow |
| Desktop styling | Tailwind CSS + shadcn/ui | Dark mode default |
| LLM runtime | Ollama | Bundled as sidecar binary in Electron extraResources |
| Mobile | Expo SDK 51 + React Native 0.74 | iOS + Android |
| Mobile styling | NativeWind v4 | Tailwind for React Native |
| API bridge | Fastify 4 | Runs on localhost:3001, also LAN-exposed |
| State management | Zustand 4 | Both desktop and mobile |
| Database | SQLite via better-sqlite3 | Desktop only. Chat history, config, conversations |
| Monorepo | Turborepo | Shared packages across apps |
| Language | TypeScript 5.5 throughout | Strict mode everywhere |

## How the System Works (end-to-end)

```
[User types message in Desktop UI]
        ↓
[Next.js chat page] → POST /api/chat → [Fastify local API]
        ↓
[Fastify] → POST http://localhost:11434/api/chat → [Ollama]
        ↓
[Ollama streams tokens back to Fastify via ndjson]
        ↓
[Fastify pipes tokens as SSE back to Next.js]
        ↓
[Next.js renders streaming tokens in chat bubble]
        ↓
[Message saved to SQLite when stream ends]
```

For mobile:
```
[User types on phone]
        ↓
[Expo app] → POST http://[desktop-LAN-ip]:3001/api/chat
        ↓
[Same Fastify server on desktop handles it]
        ↓
[SSE streams back to mobile over Wi-Fi]
```

## What the Agentic IDE Should Know

- **Always use TypeScript strict mode**. No `any` types without explicit comment explaining why.
- **Never add external API calls**. If a feature needs data, it comes from SQLite or the local Ollama instance.
- **All async DB operations** use better-sqlite3's synchronous API (it's sync by design, runs in a worker in Electron).
- **Electron main process** handles: spawning Ollama sidecar, SQLite access, system tray, app lifecycle.
- **Electron renderer process** (Next.js) handles: all UI, chat logic, model management UI.
- **IPC** between main and renderer uses typed ipcMain/ipcRenderer with a preload bridge — no nodeIntegration in renderer.
- **Mobile** never directly accesses SQLite — it goes through the Fastify API on desktop.
- **Streaming** always uses SSE (text/event-stream), never WebSockets. Simpler and works with standard fetch.
- **Models** are stored in `~/.ollama/models` (Ollama's default). Never move or copy models — just reference them by name.

## File Naming Conventions

- React components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- API routes (Next.js): `route.ts` inside `app/api/...`
- Fastify routes: `[resource].routes.ts`
- Database queries: `[resource].queries.ts`
- Types: `[resource].types.ts`
- Constants: `SCREAMING_SNAKE_CASE` for values, `camelCase` for config objects

## Environment Variables

Desktop app uses `.env.local` (never committed):
```
OLLAMA_HOST=http://localhost:11434
LOCAL_API_PORT=3001
NEXT_PUBLIC_LOCAL_API=http://localhost:3001
```

Mobile app uses `.env` (never committed):
```
EXPO_PUBLIC_DEFAULT_DESKTOP_PORT=3001
```

No secrets. No API keys. Everything is local.
# Atlas AI — Project Overview

## What Atlas AI is

Atlas AI is a privacy-first local AI project with two user-facing apps:

1. `atlas-desktop/` — the desktop app. It runs Ollama locally, exposes a Fastify API on port `3001`, and stores desktop-side conversations/settings in SQLite.
2. `atlas-mobile/` — the mobile app. It supports two inference providers:
   - `desktop` — connect to the desktop over local Wi-Fi and use the desktop Fastify API.
   - `local` — run a GGUF model directly on the phone with `llama.rn` / `llama.cpp`.

The project is offline-first:

- No cloud APIs
- No telemetry
- No account system
- No data leaves the local machine or local phone unless the user explicitly downloads a model file

## Current repository layout

This repo is currently a two-app workspace, not a Turborepo monorepo:

```text
atlas-ai/
├── atlas-desktop/
│   ├── atlas-web/        # Next.js desktop UI
│   ├── electron/         # Electron main/preload/sidecar
│   └── server/           # Fastify API + SQLite access
├── atlas-mobile/
│   ├── app/              # Expo Router screens
│   ├── components/       # React Native UI
│   ├── hooks/            # Mobile hooks
│   ├── lib/              # API, llama, model, validation utilities
│   ├── store/            # Zustand stores
│   └── android/          # Generated native Android project after prebuild
└── docs/
```

## Mobile architecture

The mobile app is no longer a thin LAN-only client.

It now has two operating modes:

### 1. Desktop mode

- Connects to the desktop Fastify API over Wi-Fi
- Uses the desktop conversation list and desktop message history
- Sends chat requests to `http://[desktop-ip]:3001/api/chat`
- Streams responses from the desktop API
- Can be exercised in Expo Go for UI/network iteration

### 2. On-device mode

- Runs a local GGUF model through `llama.rn`
- Stores downloaded/imported GGUF files in the app sandbox
- Persists local conversations and local messages in AsyncStorage
- Persists local inference settings in AsyncStorage
- Requires a development build or release build
- Does **not** work in Expo Go

## Tech stack

| Area | Technology | Notes |
|---|---|---|
| Desktop shell | Electron | Runs the desktop app |
| Desktop UI | Next.js | Inside Electron |
| Desktop API | Fastify | Port `3001` |
| Desktop model runtime | Ollama | Local desktop inference |
| Desktop persistence | SQLite | Desktop only |
| Mobile app | Expo SDK 54 + React Native 0.81 | iOS + Android |
| Mobile on-device inference | `llama.rn` | Native `llama.cpp` binding |
| Mobile styling | NativeWind | Tailwind-style RN classes |
| Mobile state | Zustand | Connection, chat, model stores |
| Mobile local persistence | AsyncStorage + Expo FileSystem | Conversations/settings + GGUF storage |

## Mobile implementation highlights

- `atlas-mobile/app/index.tsx` lets the user choose desktop mode or on-device mode.
- `atlas-mobile/app/models.tsx` manages local GGUF import/download and device-tier recommendations.
- `atlas-mobile/app/settings.tsx` configures desktop endpoint, provider selection, Hugging Face token, and local inference settings.
- `atlas-mobile/store/connection.store.ts` persists provider selection, active local model, and local generation settings.
- `atlas-mobile/store/chat.store.ts` switches between desktop-backed conversations and local AsyncStorage-backed conversations.
- `atlas-mobile/hooks/useStreamingResponse.ts` routes chat to either Fastify or `llama.rn`.
- `atlas-mobile/lib/model-validation.ts` blocks unsupported GGUFs such as embedding, reranker, and `mmproj` files.

## Important operational rules

- Use chat or instruct GGUF models for on-device chat.
- Do **not** use embedding models, reranker models, or multimodal projector files as the active chat model.
- Expo Go is valid for desktop-mode UI work, but not for local-model inference.
- Android builds for the mobile dev client should use JDK 21.

## Build/run summary

### Desktop mode

- Start the desktop app and Fastify API
- Point the phone at the desktop IP
- Use the mobile app in `desktop` provider mode

### On-device mode

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

Then open the installed `Atlas AI` app, not Expo Go.

# Atlas AI — Workspace Setup

## Repository shape

This repository is currently organized as two sibling app folders:

- `atlas-desktop/`
- `atlas-mobile/`

Earlier planning docs referred to a Turborepo-style `apps/` + `packages/` layout. That is not the current implementation. When working in this repo, treat `atlas-desktop` and `atlas-mobile` as separate app workspaces.

## Prerequisites

- Node.js + npm (install dependencies per app folder)
- Android Studio + Android SDK (Android builds)
- JDK 21 (Android builds)
- Ollama installed on the desktop machine (or bundled with the desktop app in production)

## Desktop workspace

Key folders:

- `atlas-desktop/atlas-web/` — Next.js renderer
- `atlas-desktop/electron/` — Electron main, preload, Ollama sidecar
- `atlas-desktop/server/` — Fastify + SQLite access

### Desktop install/run

```bash
cd atlas-desktop
npm install
npm run dev
```

The desktop UI is served by the Fastify server on `http://localhost:3001` and is loaded into Electron.

## Mobile workspace

Key folders:

- `atlas-mobile/app/` — Expo Router screens
- `atlas-mobile/components/` — shared React Native UI
- `atlas-mobile/hooks/` — streaming and UI hooks
- `atlas-mobile/lib/` — API, model storage, llama integration, validation
- `atlas-mobile/store/` — Zustand stores
- `atlas-mobile/android/` — generated after `expo prebuild`

## Mobile dependencies that matter

- `expo`
- `expo-router`
- `expo-dev-client`
- `expo-file-system`
- `expo-document-picker`
- `expo-build-properties`
- `llama.rn`
- `zustand`

## Mobile setup commands

```bash
cd atlas-mobile
npm install
```

### Mobile: Expo Go (UI + desktop provider only)

```bash
npx expo start --clear
```

Expo Go cannot run `llama.rn` (native module). Only the `desktop` provider can be exercised in Expo Go.

### Mobile: dev build (required for local GGUF provider)

```bash
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

## Android build requirements

- JDK 21
- Android SDK / emulator
- `expo-dev-client` installed in the mobile app

Expo Go is not sufficient for `llama.rn`.

## Suggested workflow

- Use Expo Go when iterating on navigation/layout/styling and desktop provider behavior.
- Use the dev build when iterating on local GGUF inference or anything that touches `llama.rn`.

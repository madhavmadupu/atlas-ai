# Atlas AI — Workspace Setup

## Current state

This repository is currently organized as two sibling app folders:

- `atlas-desktop/`
- `atlas-mobile/`

Earlier planning docs referred to a Turborepo-style `apps/` + `packages/` layout. That is not the current implementation. When working in this repo, treat `atlas-desktop` and `atlas-mobile` as separate app workspaces.

## Desktop workspace

Key folders:

- `atlas-desktop/atlas-web/` — Next.js renderer
- `atlas-desktop/electron/` — Electron main, preload, Ollama sidecar
- `atlas-desktop/server/` — Fastify + SQLite access

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

For desktop-mode UI work only:

```bash
npx expo start
```

For local on-device model work:

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

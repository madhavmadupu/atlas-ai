# Atlas AI

Atlas AI is a privacy-first, offline AI assistant with two apps:

- `atlas-desktop/`: Electron desktop app (Next.js UI + Fastify API + SQLite + Ollama).
- `atlas-mobile/`: Expo + React Native mobile app with two inference providers:
  - `desktop`: connect to the desktop Fastify API over LAN.
  - `local`: run a GGUF model fully offline on-device via `llama.rn` (native `llama.cpp`).

## Quickstart

### Desktop

```bash
cd atlas-desktop
npm install
npm run dev
```

### Mobile (UI + desktop provider in Expo Go)

```bash
cd atlas-mobile
npm install
npx expo start --clear
```

### Mobile (local GGUF provider)

Expo Go cannot load `llama.rn`. Use a dev build or release build.

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

## Documentation

Start here:

- `docs/README.md`
- `docs/00-PROJECT-OVERVIEW.md`

# Atlas AI — AI IDE Rules

## Project identity

Atlas AI is a local AI project with:

- a desktop app in `atlas-desktop/`
- a mobile app in `atlas-mobile/`

The mobile app now supports both:

- LAN access to the desktop Fastify API
- on-device GGUF inference through `llama.rn`

## Never violate these rules

1. Never add cloud inference APIs.
2. Never add telemetry or analytics.
3. Never make on-device inference depend on Expo Go.
4. Use TypeScript strict mode.
5. Keep the mobile provider split explicit:
   - `desktop`
   - `local`
6. Do not allow embedding, reranker, or `mmproj` files to be used as chat models.

## Current repo structure

```text
atlas-desktop/
  atlas-web/   -> Next.js desktop UI
  electron/    -> Electron main / preload / sidecar
  server/      -> Fastify API + desktop persistence

atlas-mobile/
  app/         -> Expo Router screens
  components/  -> React Native UI
  hooks/       -> streaming hooks
  lib/         -> api, llama, validation, model utilities
  store/       -> Zustand stores
```

## Mobile-specific guidance

### Desktop provider

- Use Fastify HTTP endpoints from `atlas-mobile/lib/api.ts`
- Keep LAN errors user-visible
- Do not introduce WebSockets unless there is a hard requirement

### Local provider

- Local chat must go through `atlas-mobile/lib/local-llama-engine.ts`
- Local model config belongs in `atlas-mobile/store/connection.store.ts`
- Local chat persistence belongs in `atlas-mobile/store/chat.store.ts`
- Model validation belongs in `atlas-mobile/lib/model-validation.ts`
- GGUF storage belongs in `atlas-mobile/lib/model-storage.ts`

### Expo Go rule

Do not assume local on-device inference works in Expo Go.

If adding UX around local models, prefer:

- clear dev-build requirement messaging
- explicit disable state in Expo Go

### Android build rule

When documenting or scripting Android builds for the mobile app, assume JDK 21.

## When adding mobile features

1. Decide whether the feature belongs to `desktop`, `local`, or both providers.
2. Update the provider-aware stores first.
3. Keep desktop provider and local provider behavior separate.
4. If a feature is local-only, document whether it requires a dev build or release build.
5. Update the docs under `docs/` when the mobile provider model changes.

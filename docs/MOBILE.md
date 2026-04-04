# Atlas AI — Mobile (Summary)

The mobile app is a ChatGPT-style chat UI with two inference backends (“providers”):

- `desktop`: use the desktop Fastify API over LAN (streams from desktop/Ollama).
- `local`: run a GGUF fully offline on-device using `llama.rn`.

The UI stays consistent across providers: sidebar history, top model selector, and a single composer.

## Directory map

- Screens: `atlas-mobile/app/*`
- Chat UI components: `atlas-mobile/components/chat/*`
- Provider-aware streaming: `atlas-mobile/hooks/useStreamingResponse.ts`
- Stores:
  - `atlas-mobile/store/chat.store.ts`
  - `atlas-mobile/store/connection.store.ts`
  - `atlas-mobile/store/model.store.ts`
- Local model/runtime:
  - `atlas-mobile/lib/local-llama-engine.ts`
  - `atlas-mobile/lib/local-inference.ts`
  - `atlas-mobile/lib/model-storage.ts`
  - `atlas-mobile/lib/model-validation.ts`

## Expo Go vs dev build

- Expo Go can preview UI and run the `desktop` provider.
- Expo Go cannot run the `local` provider because `llama.rn` is native.

## What to read next

- Mobile module guide: `docs/07-MOBILE-APP.md`
- Model management: `docs/08-MODEL-MANAGEMENT.md`
- Settings: `docs/10-SETTINGS.md`
- Build: `docs/09-BUILD-DISTRIBUTION.md`
- Troubleshooting: `docs/13-TROUBLESHOOTING.md`

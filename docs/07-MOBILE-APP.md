# Atlas AI — Mobile App (Expo + React Native)

The mobile app lives in `atlas-mobile/`. It is a ChatGPT-style chat UI with a provider split:

- `desktop`: connect to the desktop Fastify API over LAN (streams from desktop).
- `local`: run a GGUF fully offline on-device via `llama.rn` (native `llama.cpp`).

## Expo Go vs dev build (important)

- Expo Go can run the UI and the `desktop` provider.
- Expo Go cannot load `llama.rn`, so it can never run the `local` provider.
- For local GGUF inference you need a dev build or release build.

## Directory map

- Screens (Expo Router): `atlas-mobile/app/*`
- UI components: `atlas-mobile/components/*`
- Streaming hook: `atlas-mobile/hooks/useStreamingResponse.ts`
- Utilities:
  - `atlas-mobile/lib/api.ts` (desktop provider HTTP)
  - `atlas-mobile/lib/local-llama-engine.ts` (local provider engine)
  - `atlas-mobile/lib/model-storage.ts` (GGUF storage)
  - `atlas-mobile/lib/model-validation.ts` (block unsupported GGUF types)
- State (Zustand):
  - `atlas-mobile/store/chat.store.ts`
  - `atlas-mobile/store/connection.store.ts`
  - `atlas-mobile/store/model.store.ts`

## UI shell (ChatGPT-style)

The main entry redirects to the chat home:

- `atlas-mobile/app/index.tsx`

The chat experience is split into:

- `atlas-mobile/app/chat/index.tsx` — “home” screen: suggestions, recent chats, composer
- `atlas-mobile/app/chat/[id].tsx` — conversation screen: message list + composer

Shell components:

- `atlas-mobile/components/chat/ChatShellHeader.tsx` — top bar (safe-area aware)
- `atlas-mobile/components/chat/ChatSidebar.tsx` — conversation history sidebar
- `atlas-mobile/components/chat/ModelPicker.tsx` — provider-aware model dropdown
- `atlas-mobile/components/chat/MessageBubble.tsx` — bubbles + actions
- `atlas-mobile/components/chat/MessageInput.tsx` — composer + edit-resend UX

## Provider behavior

### Provider: `desktop`

- Requires the desktop app’s Fastify server reachable over LAN (`:3001`).
- Conversations and messages are loaded from the desktop API.
- Best for using bigger desktop-hosted models via Ollama.

Mobile uses:

- `atlas-mobile/lib/api.ts` to build URLs
- `atlas-mobile/hooks/useStreamingResponse.ts` to stream SSE from `POST /api/chat`

### Provider: `local`

- Requires an installed app binary that includes `llama.rn`.
- Requires a chat/instruct GGUF selected as the active local model.
- Conversations and messages are stored locally in AsyncStorage.

Mobile uses:

- `atlas-mobile/lib/local-llama-engine.ts` for context init + token streaming
- `atlas-mobile/lib/local-inference.ts` for presets and device tiers

## Provider selection & settings

- Provider selection and connection settings: `atlas-mobile/app/settings.tsx`
- Desktop connection helper screen: `atlas-mobile/app/connect.tsx`
- Model manager: `atlas-mobile/app/models.tsx`

Settings are persisted in:

- `atlas-mobile/store/connection.store.ts`

## Provider gating (prevent “half configured” chats)

The chat home screen enforces:

- `local` provider requires an active local GGUF selected
- `desktop` provider requires a saved, reachable desktop endpoint

This is implemented as a “mode readiness” check before starting a new chat:

- `atlas-mobile/app/chat/index.tsx`

## Message actions (ChatGPT-style)

Message bubbles support common chat actions:

- user messages: copy, edit & resend
- assistant messages: copy, regenerate, share

Implementation:

- `atlas-mobile/components/chat/MessageBubble.tsx`
- `atlas-mobile/app/chat/[id].tsx`

## Persistence model

### Desktop provider

- conversations/messages live on desktop (SQLite)
- mobile loads via `/api/conversations` and `/api/conversations/:id`

### Local provider

- conversations/messages live on phone (AsyncStorage)
- GGUF files live on phone (Expo FileSystem)

Implementation:

- `atlas-mobile/store/chat.store.ts` (provider-aware chat source)
- `atlas-mobile/lib/local-chat-storage.ts` (AsyncStorage helpers)
- `atlas-mobile/lib/model-storage.ts` (file storage helpers)

## Related docs

- Models: `docs/08-MODEL-MANAGEMENT.md`
- Settings: `docs/10-SETTINGS.md`
- Build & packaging: `docs/09-BUILD-DISTRIBUTION.md`
- Troubleshooting: `docs/13-TROUBLESHOOTING.md`

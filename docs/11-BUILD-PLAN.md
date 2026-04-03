# Atlas AI — Current Build Status

## What is already implemented

### Mobile app

- Expo Router app in `atlas-mobile/`
- Desktop provider mode over LAN
- Local provider mode with `llama.rn`
- Local GGUF import
- Hugging Face model search/download
- Device-tier recommendations for local models
- Local conversation persistence with AsyncStorage
- Local provider settings persistence
- Validation that blocks unsupported GGUF types for chat
- `expo-dev-client` setup for native mobile builds

### Desktop integration

- Desktop app remains the source of truth for desktop-backed conversations
- Mobile desktop mode still talks to the Fastify API on port `3001`

## What changed compared with the original plan

The original plan assumed the mobile app would be only a LAN client. That is no longer true.

The implemented mobile architecture is now:

- `desktop` provider for desktop-hosted Ollama
- `local` provider for on-device `llama.rn` inference

## Recommended next milestones

1. Add an explicit Expo Go guard in the mobile UI so local mode is disabled there.
2. Add in-chat model switching for local provider mode.
3. Improve Android and iOS release packaging for the offline mobile build.
4. Add device capability heuristics to preselect the best model tier automatically.
5. Add better import/download progress and error UX for large GGUF files.

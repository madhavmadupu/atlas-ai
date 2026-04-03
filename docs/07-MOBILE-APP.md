# Atlas AI — Mobile App

## Overview

The mobile app in `atlas-mobile/` now supports two inference providers:

1. `desktop`
   - connect to the desktop Fastify API over Wi-Fi
   - use the desktop conversation history
   - stream responses from the desktop

2. `local`
   - run a GGUF model directly on the phone with `llama.rn`
   - store conversations locally in AsyncStorage
   - store GGUF files in the app document directory
   - work fully offline after the model is on the phone

This means the app is no longer “mobile UI only”.

## Core files

### Entry and routing

- `atlas-mobile/app/index.tsx`
  - first screen
  - shows the high-level choice between desktop mode and on-device mode
- `atlas-mobile/app/_layout.tsx`
  - Expo Router stack
  - includes `connect`, `chat`, `models`, `settings`, and `share`

### Desktop connection flow

- `atlas-mobile/app/connect.tsx`
  - manual desktop IP / port entry
- `atlas-mobile/lib/api.ts`
  - builds Fastify endpoint URLs from the saved desktop host/port
- `atlas-mobile/store/connection.store.ts`
  - persists desktop IP, desktop port, provider selection, active local model, Hugging Face token, and local inference settings

### Chat flow

- `atlas-mobile/app/chat/index.tsx`
  - conversation list
- `atlas-mobile/app/chat/[id].tsx`
  - message view
- `atlas-mobile/hooks/useStreamingResponse.ts`
  - routes the request to either desktop Fastify or local `llama.rn`
- `atlas-mobile/store/chat.store.ts`
  - desktop mode: loads/saves via the Fastify API
  - local mode: loads/saves via AsyncStorage-backed mobile storage

### On-device model management

- `atlas-mobile/app/models.tsx`
  - import GGUF from local files
  - search/download GGUF models from Hugging Face
  - select active local model
  - choose device tier recommendations (`low`, `medium`, `high`)
- `atlas-mobile/store/model.store.ts`
  - persists the list of stored local model files
- `atlas-mobile/lib/model-storage.ts`
  - creates the app-local model folder
- `atlas-mobile/lib/huggingface.ts`
  - searches model repos and fetches file lists
- `atlas-mobile/lib/model-validation.ts`
  - rejects embedding, reranker, and `mmproj` files for chat

### On-device inference

- `atlas-mobile/lib/local-inference.ts`
  - default local generation settings
  - device-tier presets
  - recommended model repos and quantization preferences
- `atlas-mobile/lib/local-llama-engine.ts`
  - initializes `llama.rn`
  - configures context size, GPU layers, batch size
  - clears cache between conversations
  - surfaces a clear error if the installed app build does not include the native `llama.rn` module

## Current behavior

### Desktop provider

- Requires desktop app + Fastify API running
- Requires both devices on the same LAN
- Uses the desktop conversation list and message history
- Best for using larger desktop-hosted models through Ollama

### Local provider

- Requires a development build or release build
- Does not work in Expo Go
- Requires a chat/instruct GGUF
- Persists local chats on the phone
- Uses local generation settings:
  - system prompt
  - temperature
  - top-p
  - max response tokens
  - context size
  - GPU layer count

## Supported and unsupported GGUFs

### Supported

- chat models
- instruct models

Examples:

- `Qwen2.5-1.5B-Instruct`
- `Qwen2.5-3B-Instruct`
- `Llama-3.2-1B-Instruct`

### Unsupported for chat

- embedding models
- reranker models
- `mmproj` projector files

The app now blocks these model classes before they are used for local chat.

## Build requirements for local inference

`llama.rn` is a native module, so local mode needs:

- `expo-dev-client`
- `expo prebuild`
- a custom installed app binary
- JDK 21 for Android builds

Typical Android dev flow:

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

Then open the installed `Atlas AI` app, not Expo Go.

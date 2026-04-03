# Atlas AI — Mobile Application Reference

## Scope

This document describes the current mobile implementation in `atlas-mobile/`.

It covers:

- provider architecture
- state and persistence
- model management
- on-device inference
- build/runtime constraints

## Provider architecture

The mobile app supports two inference providers.

### `desktop`

- chat is sent to the desktop Fastify API over LAN
- conversation list and messages come from the desktop
- useful for accessing larger desktop Ollama models

### `local`

- chat runs on-device with `llama.rn`
- local conversations/messages are stored on the phone
- active GGUF and local generation settings are stored on the phone
- requires a native app build

## Key screens

### `atlas-mobile/app/index.tsx`

- entry screen
- routes the user to desktop or on-device setup

### `atlas-mobile/app/connect.tsx`

- desktop IP/port setup
- used for `desktop` provider mode

### `atlas-mobile/app/chat/index.tsx`

- provider-aware conversation list

### `atlas-mobile/app/chat/[id].tsx`

- provider-aware chat view

### `atlas-mobile/app/models.tsx`

- on-device GGUF manager

### `atlas-mobile/app/settings.tsx`

- provider switch
- desktop endpoint settings
- local inference settings
- Hugging Face token

## Persistence model

### Desktop provider

- no mobile-side chat database
- mobile reads/writes through desktop Fastify

### Local provider

- local conversations/messages are persisted with AsyncStorage
- local GGUF files are stored with Expo FileSystem

Files:

- `atlas-mobile/store/chat.store.ts`
- `atlas-mobile/lib/local-chat-storage.ts`
- `atlas-mobile/store/model.store.ts`
- `atlas-mobile/lib/model-storage.ts`

## Local inference stack

### Runtime

- package: `llama.rn`
- underlying engine: `llama.cpp`

### Engine wrapper

File:

- `atlas-mobile/lib/local-llama-engine.ts`

Responsibilities:

- initialize the GGUF context
- configure context size / GPU layers / batch size
- clear cache between requests
- stream tokens back to the UI
- stop generation
- raise a clear error when the app binary does not contain the native module

### Inference settings

File:

- `atlas-mobile/lib/local-inference.ts`

Current persisted settings:

- `performanceTier`
- `systemPrompt`
- `temperature`
- `topP`
- `maxTokens`
- `contextSize`
- `gpuLayers`

## Model management

### Sources

- import from local files
- download from Hugging Face

### Selection logic

- tier-aware GGUF selection by quantization preference
- store the chosen model path and model name in `connection.store`

### Validation

File:

- `atlas-mobile/lib/model-validation.ts`

The app rejects:

- embedding models
- reranker models
- `mmproj` projector files

## Build requirements

### Expo Go

Supported:

- desktop provider mode
- pure UI iteration

Not supported:

- local provider mode
- any `llama.rn` flow

### Development build

Required for local provider mode.

Typical Android flow:

```bash
cd atlas-mobile
npx expo prebuild --clean
npx expo run:android
npx expo start --dev-client
```

### Android JDK

Use JDK 21 for Android builds.

## App configuration

Important `atlas-mobile/app.json` values:

- scheme: `atlas`
- iOS bundle id: `com.atlasai.app`
- Android package: `com.atlasai.app`
- `llama.rn` Expo plugin enabled
- `enableOpenCLAndHexagon: true`

## Current limitations

- Expo Go cannot exercise local inference
- local chat persistence is AsyncStorage-based, not SQLite-based
- large GGUF downloads are still bounded by mobile storage and device RAM
- desktop provider mode and local provider mode intentionally use different persistence paths

## Recommended model classes

Use instruct/chat GGUF models for local mode.

Examples:

- Qwen2.5 1.5B Instruct
- Qwen2.5 3B Instruct
- Llama 3.2 1B Instruct

Do not use embedding GGUFs for the chat screen.

# Atlas AI — Model Management

## Overview

Atlas AI now has two model-management stories:

1. Desktop model management
   - Ollama models on the desktop
   - managed through the desktop app / Fastify / Ollama

2. Mobile on-device model management
   - GGUF files stored inside the mobile app sandbox
   - managed through the mobile Models screen
   - executed through `llama.rn`

This doc focuses on the mobile on-device path because that changed substantially.

## Mobile model manager

File: `atlas-mobile/app/models.tsx`

The mobile model manager supports:

- selecting a device tier:
  - `low`
  - `medium`
  - `high`
- importing a GGUF from the device filesystem
- searching Hugging Face for GGUF repos
- downloading a recommended quantization for the selected device tier
- selecting the active local model
- deleting locally stored model files

## Storage

GGUFs are stored under the app document directory:

- helper: `atlas-mobile/lib/model-storage.ts`
- directory name: `atlas-models/`

The store that tracks imported/downloaded models is:

- `atlas-mobile/store/model.store.ts`

## Recommendation logic

`atlas-mobile/lib/local-inference.ts` defines:

- tier presets for local generation settings
- recommended model repos per device tier
- preferred quantization order for GGUF file selection

Current tier recommendations are centered around chat-capable instruct models such as:

- `bartowski/Qwen2.5-1.5B-Instruct-GGUF`
- `bartowski/Qwen2.5-3B-Instruct-GGUF`
- `bartowski/Qwen2.5-7B-Instruct-GGUF`

## Validation

`atlas-mobile/lib/model-validation.ts` rejects files that are not suitable for chat:

- embedding models
- reranker models
- multimodal projector (`mmproj`) files

This prevents mistakes like selecting an embedding model as the active chat model.

## Runtime constraints

- Downloading a model from Hugging Face obviously requires network access.
- After the GGUF is on the phone, local inference is offline.
- Expo Go cannot run the local model path because `llama.rn` is a native module.
- A dev build or release build is required.

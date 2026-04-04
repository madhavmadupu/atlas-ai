# Atlas AI — Model Management

Atlas AI has two separate model-management stories:

1. Desktop models (Ollama)
2. Mobile on-device models (GGUF)

They are intentionally separate because they run on different devices and use different runtimes.

## Desktop (Ollama)

### What a “model” means on desktop

On desktop, Atlas uses Ollama as the model runtime. Models are identified by their Ollama name (e.g. `qwen2.5:3b`).

### Where it’s implemented

- Server endpoints:
  - `atlas-desktop/server/routes/models.ts`
  - `atlas-desktop/server/services/ollama.service.ts`
- Desktop UI:
  - `atlas-desktop/atlas-web/components/chat/ModelSelector.tsx`
  - `atlas-desktop/atlas-web/store/models.store.ts`

### API endpoints

- `GET /api/models` — list installed Ollama models
- `POST /api/models/pull` — pull a model with SSE progress
- `DELETE /api/models/:name` — delete a model

## Mobile (GGUF, on-device)

### What a “model” means on mobile local mode

On mobile `local` provider, a model is a GGUF file stored inside the app’s sandbox. The app selects one GGUF as the “active local model” and uses it for offline chat.

### Where it’s implemented

- Model manager screen: `atlas-mobile/app/models.tsx`
- Storage helpers: `atlas-mobile/lib/model-storage.ts`
- Hugging Face search/download: `atlas-mobile/lib/huggingface.ts`
- Validation: `atlas-mobile/lib/model-validation.ts`
- Settings persistence: `atlas-mobile/store/connection.store.ts` (active model + inference settings)
- Model list persistence: `atlas-mobile/store/model.store.ts`

### Storage location

GGUF files are stored under the app document directory in an app-managed folder:

- folder name: `atlas-models/`
- helper: `atlas-mobile/lib/model-storage.ts`

### Hugging Face access token

The model manager can download GGUFs from Hugging Face. For private or gated models, a token is required.

The UI uses an “edit-to-unlock” pattern for the token field to avoid accidental edits:

- `atlas-mobile/app/models.tsx`
- `atlas-mobile/app/settings.tsx`

### Supported vs unsupported GGUFs (chat)

Chat requires a generation model (chat/instruct). The app rejects:

- embedding GGUFs
- reranker GGUFs
- `mmproj` projector files (multimodal accessories)

This prevents selecting the wrong file class for chat (common mistake when browsing Hugging Face repos).

### Device tiers

Mobile local inference is configured by “device performance tier”:

- `low`
- `medium`
- `high`

The tier affects defaults like context size, max tokens, and GPU layers. See:

- `atlas-mobile/lib/local-inference.ts`

### Practical sizing guidance (mobile local)

Local inference is constrained by:

- RAM (model + context must fit)
- storage (GGUF file sizes are large)
- CPU/GPU throughput (tokens/sec varies widely)

The tier system exists to pick conservative defaults for the device you’re testing on.

## Practical workflow

### Desktop provider on mobile

If you pick provider `desktop` on mobile:

- you pick an Ollama model (desktop-side)
- the phone streams responses from the desktop API
- no GGUF is needed on the phone

### Local provider on mobile

If you pick provider `local` on mobile:

- you import/download a GGUF file once
- after that, the phone can chat fully offline

## Related docs

- Mobile app: `docs/07-MOBILE-APP.md`
- Settings: `docs/10-SETTINGS.md`
- Build/runtime constraints: `docs/09-BUILD-DISTRIBUTION.md`
- Troubleshooting: `docs/13-TROUBLESHOOTING.md`

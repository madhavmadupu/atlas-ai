# Atlas AI — Settings

## Mobile settings

The mobile settings screen lives at:

- `atlas-mobile/app/settings.tsx`

It now manages both inference providers.

## Provider selection

The user can switch between:

- `desktop`
- `local`

### Desktop provider settings

- desktop IP
- desktop port
- test and save connection
- disconnect desktop endpoint

These are persisted in:

- `atlas-mobile/store/connection.store.ts`

## Local provider settings

The local provider settings are also persisted in `atlas-mobile/store/connection.store.ts`.

Current fields:

- active local model path
- active local model name
- device performance tier
- system prompt
- temperature
- top-p
- max response tokens
- context size
- GPU layer count
- Hugging Face token

## Model manager entry point

The Settings screen links to:

- `atlas-mobile/app/models.tsx`

That screen is the source of truth for:

- importing GGUFs
- downloading GGUFs
- selecting the active local model

## Desktop settings

Desktop settings still exist on the desktop side and are separate from mobile settings. The mobile app only stores what it needs locally for provider selection and on-device inference.

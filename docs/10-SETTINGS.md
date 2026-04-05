# Atlas AI — Settings

Settings exist in both apps, but they apply to different concerns:

- Desktop settings: stored in the desktop SQLite DB and served via Fastify.
- Mobile settings: stored in AsyncStorage and govern provider selection, connection details, and local inference settings.

## Mobile settings

Screen:

- `atlas-mobile/app/settings.tsx`

Store:

- `atlas-mobile/store/connection.store.ts`

### Provider selection

The mobile app has an explicit provider split:

- `desktop` — connect to desktop Fastify over LAN
- `local` — run GGUF on-device via `llama.rn`

The settings UI is provider-aware:

- when provider is `desktop`, show only desktop connection controls
- when provider is `local`, show only local model/inference controls

### Desktop provider settings (mobile)

Fields:

- desktop IP
- desktop port
- connection test/save
- disconnect

These control where the mobile app sends requests in desktop mode (`http://<ip>:<port>/api/*`).

UX note:

- Connection fields are read-only by default and require an explicit “Edit” action before changing values.
- This prevents accidental “broken endpoint” edits during normal usage.

### Local provider settings (mobile)

Fields:

- active local GGUF model (selected in the model manager)
- device tier (`low|medium|high`)
- system prompt
- temperature / top-p
- max tokens / context size / GPU layers
- Hugging Face token (for downloads)

UX note:

- The Hugging Face token uses an “edit-to-unlock” pattern (locked by default).
- The intent is to reduce accidental token edits and keep the screen safe for screen recording.

## Desktop settings

Desktop settings are stored in SQLite and accessed through Fastify:

- `GET /api/settings`
- `GET /api/settings/:key`
- `POST /api/settings`

Implementation:

- `atlas-desktop/server/routes/settings.ts`
- `atlas-desktop/server/db.ts` (settings table helpers)

## Related docs

- Mobile app: `docs/07-MOBILE-APP.md`
- Model management: `docs/08-MODEL-MANAGEMENT.md`
- API server: `docs/03-FASTIFY-API-SERVER.md`

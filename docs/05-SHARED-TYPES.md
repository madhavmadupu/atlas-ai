# Atlas AI — “Shared” Types (Current Reality)

This repo does not currently have a shared `packages/shared` module. Instead, the desktop and mobile apps each define their own TypeScript types.

This doc explains where those types live and how to keep them aligned.

## Where types live today

### Desktop UI types

- `atlas-desktop/atlas-web/lib/types.ts`

These types are optimized for UI usage (camelCase fields like `conversationId`, `createdAt`).

### Mobile types

- `atlas-mobile/lib/types.ts`

These types reflect the mobile provider split and storage model:

- `InferenceProvider = "desktop" | "local"`
- `DevicePerformanceTier = "low" | "medium" | "high"`
- local inference settings (`LocalInferenceSettings`)

Some mobile types use snake_case fields (e.g. `conversation_id`, `created_at`) because:

- desktop persistence uses SQLite columns in snake_case, and
- the desktop API response shape mirrors those DB fields in several routes.

## API boundary: don’t assume one “universal” shape

Desktop Fastify routes return a mix of shapes:

- conversations and messages coming from SQLite are snake_case
- some desktop UI types are camelCase

So the rule is:

- treat HTTP payload types as their own contract
- translate at the boundary (UI/store layer), not deep inside components

### Common shape differences (examples)

| Concept | Desktop UI (`atlas-web`) | Server/DB | Mobile |
|---|---|---|---|
| Conversation id field | `conversationId` | `conversation_id` | `conversation_id` (mobile local storage) |
| Created timestamp | `createdAt` | `created_at` | `created_at` |
| System prompt | `systemPrompt` | `system_prompt` | stored in `connection.store` (local settings) |

The practical implication:

- Desktop UI often maps server responses into UI-friendly camelCase types.
- Mobile `desktop` provider mostly consumes server shapes directly.
- Mobile `local` provider stores a local-only shape that is consistent with its own persistence.

## Recommended discipline

When you change an API payload shape or a commonly used entity (message/conversation/model list):

1. Update the desktop route implementation in `atlas-desktop/server/routes/*.ts`
2. Update the desktop UI types in `atlas-desktop/atlas-web/lib/types.ts` (if used)
3. Update the mobile types in `atlas-mobile/lib/types.ts` (if used)
4. Update the relevant docs:
   - `docs/03-FASTIFY-API-SERVER.md`
   - `docs/07-MOBILE-APP.md`

## Future improvement (optional)

If the project stabilizes, consider extracting a small `atlas-shared/` package that contains:

- API request/response types (the contract)
- pure helpers for mapping snake_case ↔ camelCase

That reduces drift between the two apps.

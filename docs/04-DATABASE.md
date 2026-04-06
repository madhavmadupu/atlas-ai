# Atlas AI — Desktop Database (SQLite)

Atlas AI uses SQLite on the desktop to persist:

- conversations
- messages
- settings
- user memories (RAG)

Mobile `local` mode does **not** use SQLite today (it uses AsyncStorage). Mobile `desktop` mode reads/writes through the desktop API, which persists into this database.

## Where it lives

- DB + schema + queries: `atlas-desktop/server/db.ts`
- Server entry that initializes DB: `atlas-desktop/server/index.ts`
- Electron sets the DB directory to Electron `userData`: `atlas-desktop/electron/main.ts`

## Database file location

The DB filename is always `atlas.db`. The directory depends on runtime:

- In Electron: `app.getPath("userData")` (preferred)
- Fallback (when running server standalone):
  - macOS: `~/Library/Application Support/Atlas AI/atlas.db`
  - Windows: `%APPDATA%\Atlas AI\atlas.db`
  - Linux: `~/.config/Atlas AI/atlas.db`

## Schema (current)

Tables:

- `conversations`
  - `id` (TEXT primary key)
  - `title` (TEXT)
  - `model` (TEXT)
  - `system_prompt` (TEXT nullable)
  - `created_at`, `updated_at` (TEXT ISO timestamps)
- `messages`
  - `id` (TEXT primary key)
  - `conversation_id` (TEXT FK to conversations, cascade delete)
  - `role` (user/assistant/system)
  - `content` (TEXT)
  - `created_at` (TEXT ISO timestamp)
- `settings`
  - `key` (TEXT primary key)
  - `value` (TEXT)
- `user_memories` (RAG — see `docs/14-MEMORY-RAG.md`)
  - `id` (TEXT primary key)
  - `category` (TEXT — preference/fact/interest/personality/context)
  - `content` (TEXT)
  - `keywords` (TEXT, comma-separated)
  - `source_conversation_id` (TEXT nullable)
  - `confidence` (REAL, default 0.8)
  - `created_at`, `updated_at` (TEXT ISO timestamps)

Indexes:

- `idx_messages_conversation_id` on `messages(conversation_id)`
- `idx_conversations_updated_at` on `conversations(updated_at)`

## Initialization & migrations

`atlas-desktop/server/db.ts` is responsible for:

- opening the database (better-sqlite3)
- enabling:
  - WAL mode (`journal_mode = WAL`)
  - foreign keys (`foreign_keys = ON`)
- creating tables/indexes if missing (simple “migrations”)

## Query surface

`atlas-desktop/server/db.ts` exports small query helpers:

- `conversations.findMany()`, `findById()`, `create()`, `updateTitle()`, `updateTimestamp()`, `delete()`
- `messages.findByConversationId()`, `create()`, `getLastN()`
- `settings.get()`, `set()`, `getAll()`
- `memories.findAll()`, `findByCategory()`, `search()`, `findDuplicate()`, `create()`, `update()`, `delete()`

These helpers are called from Fastify routes (`atlas-desktop/server/routes/*`).

## How chat writes to the DB

The DB is written from the server, not the UI.

- `atlas-desktop/server/routes/chat.ts` appends the last user message before streaming.
- As the stream completes, it appends the assistant message.
- After appending messages it updates the conversation `updated_at` timestamp.
- On the first turn, it may auto-generate a title and update `conversations.title`.

This means the UI doesn’t need to “commit” anything; it can treat the server as source of truth.

## Inspecting the DB

The easiest way is a SQLite browser (or `sqlite3` CLI) pointing at the `atlas.db` file path printed by the server on startup.

Useful tables:

- `conversations` (sorted by `updated_at`)
- `messages` (ordered by `created_at`)

## Performance notes

- WAL mode improves concurrent read performance (useful during streaming).
- All access is synchronous (better-sqlite3), so keep queries small and indexed.

## Related docs

- Server: `docs/03-FASTIFY-API-SERVER.md`
- Desktop app: `docs/02-ELECTRON-DESKTOP.md`
- Mobile providers: `docs/07-MOBILE-APP.md`

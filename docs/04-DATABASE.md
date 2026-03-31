# Atlas AI — Database (SQLite)

## Overview

Atlas AI uses **SQLite via better-sqlite3** for all persistence. The database lives in Electron's `userData` directory:
- macOS: `~/Library/Application Support/Atlas AI/atlas.db`
- Windows: `%APPDATA%\Atlas AI\atlas.db`
- Linux: `~/.config/Atlas AI/atlas.db`

**Key decisions:**
- better-sqlite3 is synchronous — no async/await needed for queries
- DB only accessible from Electron main process — renderer uses IPC or local API
- Migrations run on app startup before any other DB access
- WAL mode enabled for better performance

---

## `packages/db/src/schema.ts`

```typescript
// Schema definition as SQL strings (executed in migrations)

export const CREATE_CONVERSATIONS = `
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New Conversation',
  model       TEXT NOT NULL,
  system_prompt TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
)
`;

export const CREATE_MESSAGES = `
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  created_at      TEXT NOT NULL
)
`;

export const CREATE_SETTINGS = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
`;

export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)`,
];

// Default settings inserted on first run
export const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: 'default_model', value: 'llama3.2:3b' },
  { key: 'theme', value: 'dark' },
  { key: 'font_size', value: '14' },
  { key: 'stream_responses', value: 'true' },
  { key: 'show_token_count', value: 'false' },
  { key: 'mobile_api_enabled', value: 'true' },
  { key: 'system_prompt', value: '' },
  { key: 'setup_complete', value: 'false' },
];
```

---

## `packages/db/src/migrations/index.ts`

```typescript
import Database from 'better-sqlite3';
import {
  CREATE_CONVERSATIONS,
  CREATE_MESSAGES,
  CREATE_SETTINGS,
  CREATE_INDEXES,
  DEFAULT_SETTINGS,
} from '../schema';

export function runMigrations(db: Database.Database): void {
  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run all table creations in a transaction
  db.transaction(() => {
    db.exec(CREATE_CONVERSATIONS);
    db.exec(CREATE_MESSAGES);
    db.exec(CREATE_SETTINGS);

    for (const indexSql of CREATE_INDEXES) {
      db.exec(indexSql);
    }

    // Insert default settings (ignore conflicts — settings may already exist)
    const insertSetting = db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    );
    for (const { key, value } of DEFAULT_SETTINGS) {
      insertSetting.run(key, value);
    }
  })();

  console.log('[DB] Migrations complete');
}
```

---

## `packages/db/src/index.ts` — DB Singleton

```typescript
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { runMigrations } from './migrations';
import { createConversationQueries } from './queries/conversations.queries';
import { createMessageQueries } from './queries/messages.queries';
import { createSettingsQueries } from './queries/settings.queries';

let db: Database.Database | null = null;

export function initDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'atlas.db');
  console.log(`[DB] Opening database at: ${dbPath}`);

  db = new Database(dbPath, {
    // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  runMigrations(db);
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return {
    conversations: createConversationQueries(db),
    messages: createMessageQueries(db),
    settings: createSettingsQueries(db),
    raw: db, // Escape hatch for complex queries
  };
}

export type AtlasDb = ReturnType<typeof getDb>;
```

---

## `packages/db/src/queries/conversations.queries.ts`

```typescript
import Database from 'better-sqlite3';
import type { Conversation } from '@atlas/shared/types';

export function createConversationQueries(db: Database.Database) {
  const findAll = db.prepare<[], Conversation>(
    `SELECT * FROM conversations ORDER BY updated_at DESC`,
  );

  const findById = db.prepare<[string], Conversation>(
    `SELECT * FROM conversations WHERE id = ?`,
  );

  const insert = db.prepare<
    [string, string, string, string | null, string, string],
    Conversation
  >(
    `INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
  );

  const update = db.prepare<[string, string | null, string, string], void>(
    `UPDATE conversations SET title = ?, system_prompt = ?, updated_at = ? WHERE id = ?`,
  );

  const updateTimestamp = db.prepare<[string, string], void>(
    `UPDATE conversations SET updated_at = ? WHERE id = ?`,
  );

  const remove = db.prepare<[string], void>(
    `DELETE FROM conversations WHERE id = ?`,
  );

  const count = db.prepare<[], { count: number }>(
    `SELECT COUNT(*) as count FROM conversations`,
  );

  return {
    findMany: (opts?: { orderBy?: string; direction?: 'asc' | 'desc' }): Conversation[] => {
      return findAll.all() as Conversation[];
    },

    findById: (id: string): Conversation | undefined => {
      return findById.get(id) as Conversation | undefined;
    },

    create: (data: {
      id: string;
      title: string;
      model: string;
      systemPrompt?: string;
      createdAt: string;
      updatedAt: string;
    }): Conversation => {
      return insert.get(
        data.id,
        data.title,
        data.model,
        data.systemPrompt ?? null,
        data.createdAt,
        data.updatedAt,
      ) as Conversation;
    },

    update: (
      id: string,
      data: Partial<{ title: string; systemPrompt: string; updatedAt: string }>,
    ): void => {
      if (data.updatedAt && !data.title) {
        updateTimestamp.run(data.updatedAt, id);
      } else {
        const current = findById.get(id) as Conversation;
        update.run(
          data.title ?? current.title,
          data.systemPrompt ?? current.system_prompt ?? null,
          data.updatedAt ?? new Date().toISOString(),
          id,
        );
      }
    },

    delete: (id: string): void => {
      remove.run(id);
    },

    count: (): number => {
      return (count.get() as { count: number }).count;
    },
  };
}
```

---

## `packages/db/src/queries/messages.queries.ts`

```typescript
import Database from 'better-sqlite3';
import type { Message } from '@atlas/shared/types';

export function createMessageQueries(db: Database.Database) {
  const findByConversationId = db.prepare<[string], Message>(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
  );

  const insert = db.prepare<
    [string, string, string, string, number | null, string],
    Message
  >(
    `INSERT INTO messages (id, conversation_id, role, content, tokens_used, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
  );

  const deleteByConversationId = db.prepare<[string], void>(
    `DELETE FROM messages WHERE conversation_id = ?`,
  );

  const getLastN = db.prepare<[string, number], Message>(
    `SELECT * FROM messages WHERE conversation_id = ?
     ORDER BY created_at DESC LIMIT ?`,
  );

  return {
    findByConversationId: (conversationId: string): Message[] => {
      return findByConversationId.all(conversationId) as Message[];
    },

    create: (data: {
      id: string;
      conversationId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      tokensUsed?: number;
      createdAt: string;
    }): Message => {
      return insert.get(
        data.id,
        data.conversationId,
        data.role,
        data.content,
        data.tokensUsed ?? null,
        data.createdAt,
      ) as Message;
    },

    deleteByConversationId: (conversationId: string): void => {
      deleteByConversationId.run(conversationId);
    },

    // Get last N messages for context window management
    getLastN: (conversationId: string, n: number): Message[] => {
      const msgs = getLastN.all(conversationId, n) as Message[];
      return msgs.reverse(); // Return in chronological order
    },
  };
}
```

---

## `packages/db/src/queries/settings.queries.ts`

```typescript
import Database from 'better-sqlite3';

export function createSettingsQueries(db: Database.Database) {
  const get = db.prepare<[string], { key: string; value: string }>(
    `SELECT * FROM settings WHERE key = ?`,
  );

  const set = db.prepare<[string, string], void>(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );

  const getAll = db.prepare<[], { key: string; value: string }>(
    `SELECT * FROM settings`,
  );

  return {
    get: (key: string): string | null => {
      const row = get.get(key) as { key: string; value: string } | undefined;
      return row?.value ?? null;
    },

    set: (key: string, value: string): void => {
      set.run(key, value);
    },

    getAll: (): Record<string, string> => {
      const rows = getAll.all() as Array<{ key: string; value: string }>;
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },

    // Typed helpers for common settings
    getDefaultModel: () => get.get('default_model')?.value ?? 'llama3.2:3b',
    setDefaultModel: (model: string) => set.run('default_model', model),
    isSetupComplete: () => get.get('setup_complete')?.value === 'true',
    markSetupComplete: () => set.run('setup_complete', 'true'),
  };
}
```

---

## `packages/db/package.json`

```json
{
  "name": "@atlas/db",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "@atlas/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "typescript": "^5.5.0"
  }
}
```

---

## Context Window Management

Ollama models have context limits. To avoid sending too many tokens:

```typescript
// In ConversationService — limit context to last N messages
const MAX_CONTEXT_MESSAGES = 20; // ~4000 tokens typical

async function buildContextMessages(conversationId: string): Promise<ChatMessage[]> {
  const db = getDb();
  // Get last 20 messages — enough context, not too much
  const messages = db.messages.getLastN(conversationId, MAX_CONTEXT_MESSAGES);
  return messages.map(m => ({ role: m.role, content: m.content }));
}
```

Future enhancement: use `tiktoken` or Ollama's own token counting to be smarter about this.
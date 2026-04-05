import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;
let dbPath: string | null = null;

/**
 * Set the database directory. Must be called before initDb().
 * In Electron, pass app.getPath('userData').
 */
export function setDbDirectory(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  dbPath = path.join(dir, "atlas.db");
}

function getDbPath(): string {
  if (dbPath) return dbPath;

  // Fallback: use platform-specific default
  const home = process.env.HOME || process.env.USERPROFILE || "";
  let dir: string;
  if (process.platform === "win32") {
    dir = path.join(process.env.APPDATA || home, "Atlas AI");
  } else if (process.platform === "darwin") {
    dir = path.join(home, "Library", "Application Support", "Atlas AI");
  } else {
    dir = path.join(home, ".config", "Atlas AI");
  }

  fs.mkdirSync(dir, { recursive: true });
  dbPath = path.join(dir, "atlas.db");
  return dbPath;
}

function runMigrations(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL DEFAULT 'New Conversation',
      model         TEXT NOT NULL,
      system_prompt TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content         TEXT NOT NULL,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

    CREATE TABLE IF NOT EXISTS user_memories (
      id                     TEXT PRIMARY KEY,
      category               TEXT NOT NULL CHECK(category IN ('preference', 'fact', 'interest', 'personality', 'context')),
      content                TEXT NOT NULL,
      keywords               TEXT NOT NULL DEFAULT '',
      source_conversation_id TEXT,
      confidence             REAL NOT NULL DEFAULT 0.8,
      created_at             TEXT NOT NULL,
      updated_at             TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memories_category ON user_memories(category);
    CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON user_memories(updated_at);
  `);
}

export function initDb(): Database.Database {
  if (db) return db;

  const resolvedPath = getDbPath();
  db = new Database(resolvedPath);

  // Enable WAL mode and foreign keys
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  console.log("[DB] Initialized at:", resolvedPath);
  return db;
}

export function getDb(): Database.Database {
  if (!db) return initDb();
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// ---- Query helpers ----

export const conversations = {
  findMany: () => {
    return getDb()
      .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
      .all();
  },

  findById: (id: string) => {
    return getDb()
      .prepare("SELECT * FROM conversations WHERE id = ?")
      .get(id);
  },

  create: (conv: {
    id: string;
    title: string;
    model: string;
    systemPrompt?: string;
    createdAt: string;
    updatedAt: string;
  }) => {
    getDb()
      .prepare(
        "INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        conv.id,
        conv.title,
        conv.model,
        conv.systemPrompt ?? null,
        conv.createdAt,
        conv.updatedAt,
      );
  },

  updateTitle: (id: string, title: string) => {
    getDb()
      .prepare(
        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
      )
      .run(title, new Date().toISOString(), id);
  },

  updateTimestamp: (id: string) => {
    getDb()
      .prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
  },

  delete: (id: string) => {
    getDb().prepare("DELETE FROM conversations WHERE id = ?").run(id);
  },
};

export const messages = {
  findByConversationId: (conversationId: string) => {
    return getDb()
      .prepare(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      )
      .all(conversationId);
  },

  create: (msg: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: string;
  }) => {
    getDb()
      .prepare(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt);
  },

  getLastN: (conversationId: string, n: number) => {
    return getDb()
      .prepare(
        "SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC",
      )
      .all(conversationId, n);
  },
};

export const settings = {
  get: (key: string): string | undefined => {
    const row = getDb()
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value;
  },

  set: (key: string, value: string) => {
    getDb()
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      )
      .run(key, value, value);
  },

  getAll: (): Record<string, string> => {
    const rows = getDb()
      .prepare("SELECT key, value FROM settings")
      .all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },
};

export interface UserMemory {
  id: string;
  category: string;
  content: string;
  keywords: string;
  source_conversation_id: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export const memories = {
  findAll: (): UserMemory[] => {
    return getDb()
      .prepare("SELECT * FROM user_memories ORDER BY updated_at DESC")
      .all() as UserMemory[];
  },

  findByCategory: (category: string): UserMemory[] => {
    return getDb()
      .prepare(
        "SELECT * FROM user_memories WHERE category = ? ORDER BY updated_at DESC",
      )
      .all(category) as UserMemory[];
  },

  search: (queryWords: string[]): UserMemory[] => {
    if (queryWords.length === 0) return [];
    // Match memories whose keywords or content contain any of the query words
    const conditions = queryWords.map(
      () => "(LOWER(keywords) LIKE ? OR LOWER(content) LIKE ?)",
    );
    const params = queryWords.flatMap((w) => {
      const term = `%${w.toLowerCase()}%`;
      return [term, term];
    });
    const sql = `SELECT *, (${queryWords
      .map(
        () =>
          "(CASE WHEN LOWER(keywords) LIKE ? THEN 2 ELSE 0 END + CASE WHEN LOWER(content) LIKE ? THEN 1 ELSE 0 END)",
      )
      .join(" + ")}) AS relevance FROM user_memories WHERE ${conditions.join(" OR ")} ORDER BY relevance DESC, confidence DESC LIMIT 10`;
    const scoreParams = queryWords.flatMap((w) => {
      const term = `%${w.toLowerCase()}%`;
      return [term, term];
    });
    return getDb()
      .prepare(sql)
      .all([...scoreParams, ...params]) as UserMemory[];
  },

  create: (mem: {
    id: string;
    category: string;
    content: string;
    keywords: string;
    sourceConversationId?: string;
    confidence?: number;
  }) => {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        "INSERT INTO user_memories (id, category, content, keywords, source_conversation_id, confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        mem.id,
        mem.category,
        mem.content,
        mem.keywords,
        mem.sourceConversationId ?? null,
        mem.confidence ?? 0.8,
        now,
        now,
      );
  },

  update: (id: string, fields: { content?: string; keywords?: string; confidence?: number }) => {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (fields.content !== undefined) { sets.push("content = ?"); vals.push(fields.content); }
    if (fields.keywords !== undefined) { sets.push("keywords = ?"); vals.push(fields.keywords); }
    if (fields.confidence !== undefined) { sets.push("confidence = ?"); vals.push(fields.confidence); }
    if (sets.length === 0) return;
    sets.push("updated_at = ?");
    vals.push(new Date().toISOString());
    vals.push(id);
    getDb().prepare(`UPDATE user_memories SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  },

  delete: (id: string) => {
    getDb().prepare("DELETE FROM user_memories WHERE id = ?").run(id);
  },

  findDuplicate: (content: string): UserMemory | undefined => {
    return getDb()
      .prepare("SELECT * FROM user_memories WHERE LOWER(content) = LOWER(?) LIMIT 1")
      .get(content) as UserMemory | undefined;
  },
};

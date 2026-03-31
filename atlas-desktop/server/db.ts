import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import fs from "fs";

let db: Database.Database | null = null;

function getDbPath(): string {
  // Use Electron's app data directory
  let userDataPath: string;
  try {
    userDataPath = app.getPath("userData");
  } catch {
    // Fallback if Electron app is not ready
    const home = process.env.HOME || process.env.USERPROFILE || "";
    if (process.platform === "win32") {
      userDataPath = path.join(
        process.env.APPDATA || home,
        "Atlas AI",
      );
    } else if (process.platform === "darwin") {
      userDataPath = path.join(
        home,
        "Library",
        "Application Support",
        "Atlas AI",
      );
    } else {
      userDataPath = path.join(home, ".config", "Atlas AI");
    }
  }

  fs.mkdirSync(userDataPath, { recursive: true });
  return path.join(userDataPath, "atlas.db");
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
  `);
}

export function initDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL mode and foreign keys
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  console.log("[DB] Initialized at:", dbPath);
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
      .prepare(
        "SELECT * FROM conversations ORDER BY updated_at DESC",
      )
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

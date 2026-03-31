"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.messages = exports.conversations = void 0;
exports.setDbDirectory = setDbDirectory;
exports.initDb = initDb;
exports.getDb = getDb;
exports.closeDb = closeDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db = null;
let dbPath = null;
/**
 * Set the database directory. Must be called before initDb().
 * In Electron, pass app.getPath('userData').
 */
function setDbDirectory(dir) {
    fs_1.default.mkdirSync(dir, { recursive: true });
    dbPath = path_1.default.join(dir, "atlas.db");
}
function getDbPath() {
    if (dbPath)
        return dbPath;
    // Fallback: use platform-specific default
    const home = process.env.HOME || process.env.USERPROFILE || "";
    let dir;
    if (process.platform === "win32") {
        dir = path_1.default.join(process.env.APPDATA || home, "Atlas AI");
    }
    else if (process.platform === "darwin") {
        dir = path_1.default.join(home, "Library", "Application Support", "Atlas AI");
    }
    else {
        dir = path_1.default.join(home, ".config", "Atlas AI");
    }
    fs_1.default.mkdirSync(dir, { recursive: true });
    dbPath = path_1.default.join(dir, "atlas.db");
    return dbPath;
}
function runMigrations(database) {
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
function initDb() {
    if (db)
        return db;
    const resolvedPath = getDbPath();
    db = new better_sqlite3_1.default(resolvedPath);
    // Enable WAL mode and foreign keys
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    console.log("[DB] Initialized at:", resolvedPath);
    return db;
}
function getDb() {
    if (!db)
        return initDb();
    return db;
}
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
// ---- Query helpers ----
exports.conversations = {
    findMany: () => {
        return getDb()
            .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
            .all();
    },
    findById: (id) => {
        return getDb()
            .prepare("SELECT * FROM conversations WHERE id = ?")
            .get(id);
    },
    create: (conv) => {
        getDb()
            .prepare("INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .run(conv.id, conv.title, conv.model, conv.systemPrompt ?? null, conv.createdAt, conv.updatedAt);
    },
    updateTitle: (id, title) => {
        getDb()
            .prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?")
            .run(title, new Date().toISOString(), id);
    },
    updateTimestamp: (id) => {
        getDb()
            .prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
            .run(new Date().toISOString(), id);
    },
    delete: (id) => {
        getDb().prepare("DELETE FROM conversations WHERE id = ?").run(id);
    },
};
exports.messages = {
    findByConversationId: (conversationId) => {
        return getDb()
            .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
            .all(conversationId);
    },
    create: (msg) => {
        getDb()
            .prepare("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
            .run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt);
    },
    getLastN: (conversationId, n) => {
        return getDb()
            .prepare("SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC")
            .all(conversationId, n);
    },
};
exports.settings = {
    get: (key) => {
        const row = getDb()
            .prepare("SELECT value FROM settings WHERE key = ?")
            .get(key);
        return row?.value;
    },
    set: (key, value) => {
        getDb()
            .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?")
            .run(key, value, value);
    },
    getAll: () => {
        const rows = getDb()
            .prepare("SELECT key, value FROM settings")
            .all();
        const result = {};
        for (const row of rows) {
            result[row.key] = row.value;
        }
        return result;
    },
};
//# sourceMappingURL=db.js.map
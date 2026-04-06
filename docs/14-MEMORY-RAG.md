# Atlas AI — Memory & RAG System

Atlas AI uses a keyword-based RAG (Retrieval-Augmented Generation) system to personalize conversations. The system extracts facts about the user from conversations and injects relevant memories into future prompts.

## Architecture overview

```text
User message
    │
    ├── 1. Retrieval: query keywords → match against stored memories
    │       └── Top 5–10 memories injected into system prompt
    │
    ├── 2. Generation: LLM responds with augmented context
    │
    └── 3. Extraction (async, post-response): LLM analyzes the exchange
            └── New facts stored with category + keywords + confidence
```

Both desktop and mobile have independent implementations that follow the same design.

## How it works

### Memory retrieval (before each chat turn)

1. The user's message is tokenized into query words (lowercase, stopwords removed, min 3 chars).
2. Words are matched against stored memory `keywords` (weight 2) and `content` (weight 1).
3. Results are sorted by score, then by confidence. Top results are selected.
4. If fewer than 3 matches, recent memories are added as padding (up to 5 total).
5. Matched memories are appended to the system prompt as a `[category] content` block.

The LLM is instructed to use these memories naturally without explicitly saying "I remember."

### Memory extraction (after each chat turn)

1. After the assistant response finishes streaming, extraction runs **asynchronously** — it never blocks the chat.
2. The user message + assistant response are sent to the LLM with a structured extraction prompt.
3. The LLM returns a JSON array of facts, each with `category`, `content`, and `keywords`.
4. Each fact is validated and checked for duplicates:
   - If a near-duplicate exists, its `confidence` is boosted by `+0.05` (capped at 1.0).
   - Otherwise, a new memory is created with `confidence: 0.8`.
5. Extraction errors are silently caught — they never break the chat flow.

### Memory categories

| Category      | Description                                          | Example                              |
|---------------|------------------------------------------------------|--------------------------------------|
| `preference`  | Things the user likes, dislikes, or prefers          | "Prefers dark mode"                  |
| `fact`        | Concrete facts about the user                        | "Works as a software engineer"       |
| `interest`    | Topics or activities the user is interested in       | "Interested in machine learning"     |
| `personality` | Behavioral traits or communication style             | "Prefers concise answers"            |
| `context`     | Situational context about current work               | "Building a React app"               |

## Implementation by platform

### Desktop

| Component         | File                                                  |
|-------------------|-------------------------------------------------------|
| Memory service    | `atlas-desktop/server/services/memory.service.ts`     |
| API routes        | `atlas-desktop/server/routes/memory.ts`               |
| DB schema/queries | `atlas-desktop/server/db.ts` (`user_memories` table)  |
| Chat integration  | `atlas-desktop/server/routes/chat.ts`                 |

- Uses **Ollama** (`/api/generate`) for extraction with `temperature: 0.1` and `num_predict: 512`.
- Stores memories in **SQLite** (`user_memories` table).
- Exposes a full CRUD + search API under `/api/memories`.

### Mobile

| Component        | File                                          |
|------------------|-----------------------------------------------|
| Memory service   | `atlas-mobile/lib/memory-service.ts`          |
| Storage layer    | `atlas-mobile/lib/memory-storage.ts`          |
| Chat integration | `atlas-mobile/hooks/useStreamingResponse.ts`  |

- **Local provider**: Uses `llama.rn` (native llama.cpp) for extraction. Stores memories in **AsyncStorage** under `@atlas/user-memories/v1`.
- **Desktop provider**: The desktop server handles extraction internally. The mobile app can fetch memories via `GET /api/memories`.

## Data model

```typescript
interface UserMemory {
  id: string;
  category: 'preference' | 'fact' | 'interest' | 'personality' | 'context';
  content: string;           // The extracted fact
  keywords: string;          // Comma-separated search terms
  sourceConversationId: string | null;
  confidence: number;        // 0–1, increases on re-extraction
  createdAt: string;         // ISO timestamp
  updatedAt: string;
}
```

### Desktop SQLite schema (`user_memories`)

| Column                   | Type    | Notes                          |
|--------------------------|---------|--------------------------------|
| `id`                     | TEXT PK |                                |
| `category`               | TEXT    | One of the five categories     |
| `content`                | TEXT    |                                |
| `keywords`               | TEXT    | Comma-separated                |
| `source_conversation_id` | TEXT    | Nullable                       |
| `confidence`             | REAL    | Default 0.8, manual = 1.0     |
| `created_at`             | TEXT    | ISO timestamp                  |
| `updated_at`             | TEXT    | ISO timestamp                  |

## API reference (desktop)

All routes are under `/api`.

| Method   | Path                     | Description                          |
|----------|--------------------------|--------------------------------------|
| `GET`    | `/memories`              | List all (optionally `?category=`)   |
| `GET`    | `/memories/search?q=...` | Keyword search                       |
| `POST`   | `/memories`              | Create manually (confidence = 1.0)   |
| `PUT`    | `/memories/:id`          | Update content/keywords/confidence   |
| `DELETE` | `/memories/:id`          | Delete a memory                      |

### Examples

```bash
# List all memories
curl http://localhost:3001/api/memories

# Filter by category
curl http://localhost:3001/api/memories?category=preference

# Search
curl http://localhost:3001/api/memories/search?q=python+programming

# Create manually
curl -X POST http://localhost:3001/api/memories \
  -H "Content-Type: application/json" \
  -d '{"category":"fact","content":"Prefers TypeScript","keywords":"typescript,language"}'

# Delete
curl -X DELETE http://localhost:3001/api/memories/<id>
```

## Design decisions

- **Keyword-based, not vector-based**: Uses substring matching rather than embeddings. Simpler to implement and run offline without a separate vector store.
- **Best-effort extraction**: Failures are silently caught. Memory is a nice-to-have, not a requirement for chat to work.
- **No cross-device sync**: Desktop and mobile (local) maintain separate memory stores. Mobile desktop-provider reads from the desktop's SQLite.
- **Confidence scoring**: Repeated extraction of the same fact boosts confidence rather than creating duplicates.
- **Non-blocking**: Extraction runs after the response is sent, so it adds zero latency to the user's chat experience.

## Related docs

- API server: `docs/03-FASTIFY-API-SERVER.md`
- Database schema: `docs/04-DATABASE.md`
- Mobile app: `docs/07-MOBILE-APP.md`

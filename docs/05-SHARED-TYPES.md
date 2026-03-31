# Atlas AI — Shared Types & Constants

## Overview

The `@atlas/shared` package contains TypeScript types, constants, and pure utility functions shared between the desktop app and mobile app. It has zero runtime dependencies and is tree-shaken in both apps.

---

## `packages/shared/src/types/chat.types.ts`

```typescript
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tokens_used: number | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Streaming response events
export type StreamEvent =
  | { type: 'token'; token: string }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; error: string };
```

---

## `packages/shared/src/types/model.types.ts`

```typescript
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;        // bytes
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;  // e.g. "3.2B"
    quantization_level: string;  // e.g. "Q4_K_M"
  };
}

export interface PullProgress {
  status: string;         // "pulling manifest", "downloading", "success" etc.
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export interface OllamaChatChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

// Our curated list of recommended models
export interface RecommendedModel {
  name: string;          // Ollama model name e.g. "llama3.2:3b"
  displayName: string;   // e.g. "Llama 3.2 3B"
  description: string;
  sizeGB: number;        // Approximate download size
  ramRequiredGB: number; // Minimum RAM needed
  strengths: string[];
  tier: 'fast' | 'balanced' | 'capable';
}
```

---

## `packages/shared/src/types/api.types.ts`

```typescript
export interface ChatRequest {
  conversationId?: string;
  model: string;
  messages: import('./chat.types').ChatMessage[];
  systemPrompt?: string;
}

export interface ChatStreamEvent {
  token?: string;
  done?: boolean;
  error?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  app: string;
  version: string;
  lanIP: string | null;
  timestamp: number;
}

export interface PairingTokenResponse {
  token: string;
  lanIP: string | null;
  port: number;
  connectionString: string;  // atlas://connect?ip=...&port=...&token=...
}

export interface ApiError {
  error: string;
  code?: string;
}
```

---

## `packages/shared/src/constants/models.constants.ts`

```typescript
import type { RecommendedModel } from '../types/model.types';

export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    description: 'Best all-around model. Fast, accurate, great for most tasks.',
    sizeGB: 2.0,
    ramRequiredGB: 4,
    strengths: ['General chat', 'Writing', 'Reasoning', 'Code'],
    tier: 'balanced',
  },
  {
    name: 'llama3.2:1b',
    displayName: 'Llama 3.2 1B',
    description: 'Smallest and fastest. For older hardware or quick responses.',
    sizeGB: 0.8,
    ramRequiredGB: 2,
    strengths: ['Quick responses', 'Low-resource devices'],
    tier: 'fast',
  },
  {
    name: 'gemma2:2b',
    displayName: 'Gemma 2 2B',
    description: "Google's efficient model. Strong at instruction following.",
    sizeGB: 1.6,
    ramRequiredGB: 4,
    strengths: ['Instruction following', 'Writing', 'Analysis'],
    tier: 'fast',
  },
  {
    name: 'phi3:mini',
    displayName: 'Phi-3 Mini',
    description: "Microsoft's small but capable model. Great for constrained hardware.",
    sizeGB: 2.3,
    ramRequiredGB: 4,
    strengths: ['Reasoning', 'Code', 'Math'],
    tier: 'fast',
  },
  {
    name: 'qwen2.5:3b',
    displayName: 'Qwen 2.5 3B',
    description: 'Strong multilingual model. Excellent for non-English languages.',
    sizeGB: 2.0,
    ramRequiredGB: 4,
    strengths: ['Multilingual', 'Code', 'Math'],
    tier: 'balanced',
  },
  {
    name: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B',
    description: 'High capability model. Needs 8GB+ RAM. Best quality responses.',
    sizeGB: 4.7,
    ramRequiredGB: 8,
    strengths: ['Complex reasoning', 'Long context', 'Code', 'Creative writing'],
    tier: 'capable',
  },
  {
    name: 'mistral:7b',
    displayName: 'Mistral 7B',
    description: 'Excellent for coding and technical tasks. Needs 8GB+ RAM.',
    sizeGB: 4.1,
    ramRequiredGB: 8,
    strengths: ['Code generation', 'Technical writing', 'Analysis'],
    tier: 'capable',
  },
  {
    name: 'deepseek-coder:6.7b',
    displayName: 'DeepSeek Coder 6.7B',
    description: 'Specialized for coding. Best code model at this size.',
    sizeGB: 3.8,
    ramRequiredGB: 8,
    strengths: ['Code generation', 'Code review', 'Debugging'],
    tier: 'capable',
  },
];

export const DEFAULT_MODEL = 'llama3.2:3b';

// System prompts
export const DEFAULT_SYSTEM_PROMPT = `You are Atlas, a helpful AI assistant running completely locally on this device. 
You are private, fast, and offline. All conversations stay on this device.
Be concise, helpful, and direct in your responses.`;

export const CODE_SYSTEM_PROMPT = `You are Atlas, an expert coding assistant running locally. 
Help with code, debugging, architecture, and technical questions.
Format code in markdown code blocks with the appropriate language identifier.`;
```

---

## `packages/shared/src/constants/api.constants.ts`

```typescript
export const API_BASE_URL = 'http://localhost:3001';
export const OLLAMA_BASE_URL = 'http://localhost:11434';

export const API_ROUTES = {
  health: '/api/health',
  healthOllama: '/api/health/ollama',
  chat: '/api/chat',
  conversations: '/api/conversations',
  conversation: (id: string) => `/api/conversations/${id}`,
  models: '/api/models',
  modelsPull: '/api/models/pull',
  modelsDelete: (name: string) => `/api/models/${encodeURIComponent(name)}`,
  pairingToken: '/api/pairing/token',
  pairingVerify: '/api/pairing/verify',
} as const;

export const DEFAULT_PORT = 3001;
export const OLLAMA_PORT = 11434;

// SSE stream timeout — abort stream if no data for 30s
export const STREAM_TIMEOUT_MS = 30_000;

// Max context messages sent to model
export const MAX_CONTEXT_MESSAGES = 20;
```

---

## `packages/shared/src/utils/format.ts`

```typescript
// Format bytes to human readable (e.g. 2147483648 → "2.0 GB")
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format a pull progress percentage
export function formatPullProgress(completed?: number, total?: number): number {
  if (!completed || !total || total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Format a date to relative time (e.g. "2 hours ago")
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString();
}

// Truncate text with ellipsis
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
```

---

## `packages/shared/src/utils/id.ts`

```typescript
// Simple ID generator — use nanoid in practice
export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
```

---

## `packages/shared/src/types/index.ts`

```typescript
export * from './chat.types';
export * from './model.types';
export * from './api.types';
```

---

## `packages/shared/package.json`

```json
{
  "name": "@atlas/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./constants": {
      "import": "./dist/constants/index.js",
      "types": "./dist/constants/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```
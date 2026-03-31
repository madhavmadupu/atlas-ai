import type { RecommendedModel, Settings } from "./types";

export const API_BASE = "http://localhost:3001/api";
export const OLLAMA_BASE = "http://localhost:11434";

export const DEFAULT_MODEL = "llama3.2:3b";
export const DEFAULT_SYSTEM_PROMPT =
  "You are Atlas, a helpful AI assistant running locally on the user's machine. Be concise, accurate, and helpful.";

export const STREAM_TIMEOUT_MS = 30_000;
export const MAX_CONTEXT_MESSAGES = 20;
export const HEALTH_POLL_INTERVAL_MS = 5_000;

export const DEFAULT_SETTINGS: Settings = {
  defaultModel: DEFAULT_MODEL,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  streamResponses: true,
  showTokenCount: false,
  setupComplete: false,
};

export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 3B",
    size: "2.0 GB",
    ram: "4 GB",
    tier: "balanced",
    description: "General chat, writing, reasoning, code",
  },
  {
    id: "llama3.2:1b",
    name: "Llama 3.2 1B",
    size: "0.8 GB",
    ram: "2 GB",
    tier: "fast",
    description: "Quick responses, low-resource",
  },
  {
    id: "gemma2:2b",
    name: "Gemma 2 2B",
    size: "1.6 GB",
    ram: "4 GB",
    tier: "fast",
    description: "Instruction following, writing",
  },
  {
    id: "phi3:mini",
    name: "Phi-3 Mini",
    size: "2.3 GB",
    ram: "4 GB",
    tier: "fast",
    description: "Reasoning, code, math",
  },
  {
    id: "qwen2.5:3b",
    name: "Qwen 2.5 3B",
    size: "2.0 GB",
    ram: "4 GB",
    tier: "balanced",
    description: "Multilingual, code, math",
  },
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    size: "4.7 GB",
    ram: "8 GB",
    tier: "capable",
    description: "Complex reasoning, long context",
  },
  {
    id: "mistral:7b",
    name: "Mistral 7B",
    size: "4.1 GB",
    ram: "8 GB",
    tier: "capable",
    description: "Code generation, technical writing",
  },
  {
    id: "deepseek-coder:6.7b",
    name: "DeepSeek Coder",
    size: "3.8 GB",
    ram: "8 GB",
    tier: "capable",
    description: "Code generation, debugging",
  },
];

export const API_ROUTES = {
  health: `${API_BASE}/health`,
  healthOllama: `${API_BASE}/health/ollama`,
  chat: `${API_BASE}/chat`,
  conversations: `${API_BASE}/conversations`,
  conversation: (id: string) => `${API_BASE}/conversations/${id}`,
  models: `${API_BASE}/models`,
  modelsPull: `${API_BASE}/models/pull`,
  modelsDelete: (name: string) =>
    `${API_BASE}/models/${encodeURIComponent(name)}`,
  settings: `${API_BASE}/settings`,
  setting: (key: string) => `${API_BASE}/settings/${key}`,
} as const;

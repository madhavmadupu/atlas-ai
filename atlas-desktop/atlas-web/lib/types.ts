export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ChatRequest {
  conversationId?: string;
  model: string;
  messages: { role: MessageRole; content: string }[];
  systemPrompt?: string;
}

export interface StreamEvent {
  token?: string;
  done?: boolean;
  error?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
}

export interface PullProgress {
  status: string;
  completed?: number;
  total?: number;
  digest?: string;
}

export type ModelTier = "fast" | "balanced" | "capable";

export interface RecommendedModel {
  id: string;
  name: string;
  size: string;
  ram: string;
  tier: ModelTier;
  description: string;
}

export interface Settings {
  defaultModel: string;
  systemPrompt: string;
  streamResponses: boolean;
  showTokenCount: boolean;
  setupComplete: boolean;
}

export interface HealthResponse {
  status: "ok" | "error";
  app: string;
  version: string;
  timestamp: string;
}

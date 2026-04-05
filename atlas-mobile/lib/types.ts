export type MessageRole = 'user' | 'assistant' | 'system';
export type InferenceProvider = 'desktop' | 'local';
export type DevicePerformanceTier = 'low' | 'medium' | 'high';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  persona_id?: string;
  created_at: string;
  updated_at: string;
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

export interface StreamEvent {
  token?: string;
  done?: boolean;
  error?: string;
}

export type LocalModelSource = 'huggingface' | 'manual';

export interface LocalInferenceSettings {
  performanceTier: DevicePerformanceTier;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextSize: number;
  gpuLayers: number;
}

export interface ChatModelValidationResult {
  isChatCapable: boolean;
  reason?: string;
}

function normalizeModelDescriptor(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').trim().toLowerCase();
}

export function validateLocalChatModel(
  parts: Array<string | null | undefined>
): ChatModelValidationResult {
  const descriptor = normalizeModelDescriptor(parts);

  if (!descriptor) {
    return {
      isChatCapable: false,
      reason: 'No local model is selected.',
    };
  }

  if (descriptor.includes('mmproj')) {
    return {
      isChatCapable: false,
      reason: 'This file is a multimodal projector, not a standalone chat model.',
    };
  }

  if (descriptor.includes('embedding') || descriptor.includes('embed')) {
    return {
      isChatCapable: false,
      reason:
        'This GGUF is an embedding model. Atlas chat needs an instruct/chat generation model.',
    };
  }

  if (descriptor.includes('rerank') || descriptor.includes('reranker')) {
    return {
      isChatCapable: false,
      reason: 'This GGUF is a reranker model, not a chat generation model.',
    };
  }

  return { isChatCapable: true };
}

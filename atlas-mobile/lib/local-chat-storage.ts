import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Conversation, Message } from '@/lib/types';

const STORAGE_KEY = '@atlas/local-chat-history/v1';

interface LocalChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
}

const EMPTY_STATE: LocalChatState = {
  conversations: [],
  messagesByConversation: {},
};

export async function readLocalChatState(): Promise<LocalChatState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as LocalChatState;
    return {
      conversations: parsed.conversations ?? [],
      messagesByConversation: parsed.messagesByConversation ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function writeLocalChatState(state: LocalChatState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function buildConversationTitle(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New Conversation';
  if (normalized.length <= 48) return normalized;
  return `${normalized.slice(0, 45).trimEnd()}...`;
}

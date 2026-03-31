import { create } from 'zustand';
import type { Conversation, Message } from '@/lib/types';
import { routes } from '@/lib/api';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface ChatState {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
}

interface ChatActions {
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  createConversation: (model: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamToken: (token: string) => void;
  finishStreaming: () => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversationId: null,
  isStreaming: false,
  streamingContent: '',
  error: null,

  loadConversations: async () => {
    try {
      const res = await fetch(routes.conversations());
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      set({ conversations: data });
    } catch {
      set({ conversations: [] });
    }
  },

  loadMessages: async (conversationId: string) => {
    try {
      const res = await fetch(routes.conversation(conversationId));
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      set({ messages: data.messages ?? [] });
    } catch {
      set({ messages: [] });
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id, messages: [], streamingContent: '' });
    if (id) get().loadMessages(id);
  },

  createConversation: async (model: string) => {
    const id = generateId();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id,
      title: 'New Conversation',
      model,
      created_at: now,
      updated_at: now,
    };

    try {
      await fetch(routes.conversations(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: conversation.title,
          model,
          createdAt: now,
          updatedAt: now,
        }),
      });
    } catch {
      // Continue with local state
    }

    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
      messages: [],
      streamingContent: '',
    }));
    return id;
  },

  deleteConversation: async (id: string) => {
    try {
      await fetch(routes.conversation(id), { method: 'DELETE' });
    } catch {
      // Continue
    }
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      messages: state.activeConversationId === id ? [] : state.messages,
    }));
  },

  addUserMessage: (content: string) => {
    const msg: Message = {
      id: generateId(),
      conversation_id: get().activeConversationId ?? '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  startStreaming: () => {
    set({ isStreaming: true, streamingContent: '', error: null });
  },

  appendStreamToken: (token: string) => {
    set((state) => ({ streamingContent: state.streamingContent + token }));
  },

  finishStreaming: () => {
    const { streamingContent, activeConversationId, messages } = get();
    if (streamingContent) {
      const assistantMsg: Message = {
        id: generateId(),
        conversation_id: activeConversationId ?? '',
        role: 'assistant',
        content: streamingContent,
        created_at: new Date().toISOString(),
      };
      set({
        messages: [...messages, assistantMsg],
        isStreaming: false,
        streamingContent: '',
      });
    } else {
      set({ isStreaming: false, streamingContent: '' });
    }
  },

  setError: (error) => {
    set({ error, isStreaming: false, streamingContent: '' });
  },

  clearMessages: () => {
    set({ messages: [], streamingContent: '' });
  },
}));

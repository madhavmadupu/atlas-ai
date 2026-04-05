import { create } from 'zustand';
import { routes } from '@/lib/api';
import {
  buildConversationTitle,
  readLocalChatState,
  writeLocalChatState,
} from '@/lib/local-chat-storage';
import type { Conversation, Message } from '@/lib/types';
import { useConnectionStore } from '@/store/connection.store';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isLocalProvider(): boolean {
  return useConnectionStore.getState().inferenceProvider === 'local';
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  );
}

async function appendLocalMessage(message: Message): Promise<void> {
  const state = await readLocalChatState();
  const existingMessages = state.messagesByConversation[message.conversation_id] ?? [];
  const nextMessages = [...existingMessages, message];

  const conversations = state.conversations.map((conversation) => {
    if (conversation.id !== message.conversation_id) return conversation;

    const shouldRetitle =
      message.role === 'user' &&
      (conversation.title === 'New Conversation' || existingMessages.length === 0);

    return {
      ...conversation,
      title: shouldRetitle ? buildConversationTitle(message.content) : conversation.title,
      updated_at: message.created_at,
    };
  });

  await writeLocalChatState({
    conversations: sortConversations(conversations),
    messagesByConversation: {
      ...state.messagesByConversation,
      [message.conversation_id]: nextMessages,
    },
  });
}

async function deleteLocalConversation(conversationId: string): Promise<void> {
  const state = await readLocalChatState();
  const messagesByConversation = { ...state.messagesByConversation };
  delete messagesByConversation[conversationId];

  await writeLocalChatState({
    conversations: state.conversations.filter((conversation) => conversation.id !== conversationId),
    messagesByConversation,
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
  addUserMessage: (content: string, conversationId?: string | null) => void;
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
    if (isLocalProvider()) {
      const state = await readLocalChatState();
      set({ conversations: sortConversations(state.conversations) });
      return;
    }

    try {
      const response = await fetch(routes.conversations());
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      set({ conversations: data });
    } catch {
      set({ conversations: [] });
    }
  },

  loadMessages: async (conversationId: string) => {
    if (isLocalProvider()) {
      const state = await readLocalChatState();
      set({ messages: state.messagesByConversation[conversationId] ?? [] });
      return;
    }

    try {
      const response = await fetch(routes.conversation(conversationId));
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      set({ messages: data.messages ?? [] });
    } catch {
      set({ messages: [] });
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id, messages: [], streamingContent: '', error: null });
    if (id) {
      void get().loadMessages(id);
    }
  },

<<<<<<< HEAD
  createConversation: async (model: string) => {
=======
  createConversation: async (model: string, personaId?: string) => {
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
    const now = new Date().toISOString();
    const id = generateId();
    const conversation: Conversation = {
      id,
      title: 'New Conversation',
      model,
      created_at: now,
      updated_at: now,
    };

    if (isLocalProvider()) {
      const state = await readLocalChatState();
      const conversations = sortConversations([conversation, ...state.conversations]);
      await writeLocalChatState({
        conversations,
        messagesByConversation: {
          ...state.messagesByConversation,
          [id]: [],
        },
      });

      set({
        conversations,
        activeConversationId: id,
        messages: [],
        streamingContent: '',
        error: null,
      });
      return id;
    }

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
      // Continue with local state while the desktop is unreachable.
    }

    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
      messages: [],
      streamingContent: '',
      error: null,
    }));
    return id;
  },

  deleteConversation: async (id: string) => {
    if (isLocalProvider()) {
      await deleteLocalConversation(id);
    } else {
      try {
        await fetch(routes.conversation(id), { method: 'DELETE' });
      } catch {
        // Continue with local state.
      }
    }

    set((state) => ({
      conversations: state.conversations.filter((conversation) => conversation.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
      messages: state.activeConversationId === id ? [] : state.messages,
      streamingContent: state.activeConversationId === id ? '' : state.streamingContent,
    }));
  },

  addUserMessage: (content: string, conversationId) => {
    const message: Message = {
      id: generateId(),
      conversation_id: conversationId ?? get().activeConversationId ?? '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    set((state) => {
      const conversations = state.conversations.map((conversation) =>
        conversation.id === message.conversation_id
          ? {
              ...conversation,
              title:
                conversation.title === 'New Conversation'
                  ? buildConversationTitle(content)
                  : conversation.title,
              updated_at: message.created_at,
            }
          : conversation
      );

      return {
        conversations: sortConversations(conversations),
        messages: [...state.messages, message],
      };
    });

    if (isLocalProvider()) {
      void appendLocalMessage(message);
    }
  },

  startStreaming: () => {
    set({ isStreaming: true, streamingContent: '', error: null });
  },

  appendStreamToken: (token: string) => {
    set((state) => ({ streamingContent: state.streamingContent + token }));
  },

  finishStreaming: () => {
    const { streamingContent, activeConversationId, messages } = get();

    if (!streamingContent) {
      set({ isStreaming: false, streamingContent: '' });
      return;
    }

    const assistantMessage: Message = {
      id: generateId(),
      conversation_id: activeConversationId ?? '',
      role: 'assistant',
      content: streamingContent,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      conversations: sortConversations(
        state.conversations.map((conversation) =>
          conversation.id === assistantMessage.conversation_id
            ? { ...conversation, updated_at: assistantMessage.created_at }
            : conversation
        )
      ),
      messages: [...messages, assistantMessage],
      isStreaming: false,
      streamingContent: '',
    }));

    if (isLocalProvider()) {
      void appendLocalMessage(assistantMessage);
    }
  },

  setError: (error) => {
    set({ error, isStreaming: false, streamingContent: '' });
  },

  clearMessages: () => {
    set({ messages: [], streamingContent: '', error: null });
  },
}));

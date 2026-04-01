import { create } from "zustand";
import type { Conversation, Message } from "@/lib/types";
import { API_ROUTES } from "@/lib/constants";
import { generateId } from "@/lib/utils";

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
  createConversation: (model: string, personaId?: string) => Promise<string>;
  deleteConversation: (id: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamToken: (token: string) => void;
  finishStreaming: () => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversationId: null,
  isStreaming: false,
  streamingContent: "",
  error: null,

  loadConversations: async () => {
    try {
      const res = await fetch(API_ROUTES.conversations);
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = await res.json();
      set({ conversations: data });
    } catch {
      set({ conversations: [] });
    }
  },

  loadMessages: async (conversationId: string) => {
    try {
      const res = await fetch(API_ROUTES.conversation(conversationId));
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      set({ messages: data.messages ?? [] });
    } catch {
      set({ messages: [] });
    }
  },

  setActiveConversation: (id: string | null) => {
    set({ activeConversationId: id, messages: [], streamingContent: "" });
    if (id) {
      get().loadMessages(id);
      window.history.pushState(null, "", `/?id=${id}`);
    } else {
      window.history.pushState(null, "", "/");
    }
  },

  createConversation: async (model: string, personaId?: string) => {
    const id = generateId();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id,
      title: "New Conversation",
      model,
      personaId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await fetch(API_ROUTES.conversations, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(conversation),
      });
    } catch {
      // Server may not be running yet — continue with local state
    }

    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: id,
      messages: [],
      streamingContent: "",
    }));

    window.history.pushState(null, "", `/?id=${id}`);
    return id;
  },

  deleteConversation: async (id: string) => {
    try {
      await fetch(API_ROUTES.conversation(id), { method: "DELETE" });
    } catch {
      // Continue with local state
    }

    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id);
      const isActive = state.activeConversationId === id;
      return {
        conversations,
        activeConversationId: isActive ? null : state.activeConversationId,
        messages: isActive ? [] : state.messages,
      };
    });
  },

  addUserMessage: (content: string) => {
    const msg: Message = {
      id: generateId(),
      conversationId: get().activeConversationId ?? "",
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  startStreaming: () => {
    set({ isStreaming: true, streamingContent: "", error: null });
  },

  appendStreamToken: (token: string) => {
    set((state) => ({ streamingContent: state.streamingContent + token }));
  },

  finishStreaming: () => {
    const { streamingContent, activeConversationId, messages } = get();
    if (streamingContent) {
      const assistantMsg: Message = {
        id: generateId(),
        conversationId: activeConversationId ?? "",
        role: "assistant",
        content: streamingContent,
        createdAt: new Date().toISOString(),
      };
      set({
        messages: [...messages, assistantMsg],
        isStreaming: false,
        streamingContent: "",
      });
    } else {
      set({ isStreaming: false, streamingContent: "" });
    }
  },

  setError: (error: string | null) => {
    set({ error, isStreaming: false, streamingContent: "" });
  },
}));

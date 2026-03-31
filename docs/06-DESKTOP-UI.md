# Atlas AI — Desktop UI (Next.js + shadcn)

## Overview

The desktop UI is a Next.js 14 app (App Router) rendered inside Electron. It's a single-page-like experience with a sidebar for conversations and a main chat area.

**Design language:**
- Dark by default (`bg-[#0a0a0a]` base)
- Sidebar: `bg-[#111111]` 
- Chat bubbles: user is right-aligned with accent color, assistant is left-aligned gray
- Monospace code blocks with syntax highlighting
- No light mode (privacy app — dark is intentional)

---

## `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Atlas AI',
  description: 'Your private, offline AI assistant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

---

## `src/app/chat/[id]/page.tsx` — Main Chat Page

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useChatStore } from '@/store/chat.store';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const loadConversation = useChatStore((s) => s.loadConversation);

  useEffect(() => {
    if (id) loadConversation(id);
  }, [id, loadConversation]);

  return <ChatWindow conversationId={id} />;
}
```

---

## `src/components/layout/AppShell.tsx`

```tsx
'use client';

import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { useOllamaStatus } from '@/hooks/useOllamaStatus';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSetupComplete } = useOllamaStatus();

  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## `src/components/layout/Sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, MessageSquare, Settings, Cpu } from 'lucide-react';
import { useChatStore } from '@/store/chat.store';
import { formatRelativeTime, truncate } from '@atlas/shared/utils';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, createConversation } = useChatStore();

  const handleNew = async () => {
    const id = await createConversation();
    router.push(`/chat/${id}`);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-[#111111]">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={handleNew}
          className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-white/30">
            No conversations yet
          </p>
        )}
        {conversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;
          return (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className={cn(
                'group flex flex-col gap-0.5 rounded-lg px-3 py-2 transition',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80',
              )}
            >
              <span className="truncate text-sm font-medium">
                {truncate(conv.title, 35)}
              </span>
              <span className="text-xs opacity-50">
                {formatRelativeTime(conv.updated_at)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-white/10 p-2">
        <Link
          href="/models"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white/70"
        >
          <Cpu size={15} />
          Models
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white/70"
        >
          <Settings size={15} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
```

---

## `src/components/chat/ChatWindow.tsx`

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { StreamingCursor } from './StreamingCursor';
import { useChatStore } from '@/store/chat.store';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, streamingContent } = useChatStore();
  const { sendMessage } = useStreamingResponse(conversationId);

  // Auto-scroll on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-4xl">◎</div>
              <h2 className="text-xl font-medium text-white/80">Atlas AI</h2>
              <p className="mt-2 text-sm text-white/40">
                Your private, offline assistant. Nothing leaves this device.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Streaming response bubble */}
          {isStreaming && (
            <div className="mb-4 flex gap-3">
              <div className="flex-1">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3 text-sm text-white/90">
                  {streamingContent || <StreamingCursor />}
                  {streamingContent && <StreamingCursor />}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <MessageInput onSend={sendMessage} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/chat/MessageBubble.tsx`

```tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import type { Message } from '@atlas/shared/types';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@atlas/shared/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'mb-4 flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'rounded-tr-sm bg-indigo-600 text-white'
            : 'rounded-tl-sm bg-white/5 text-white/90',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node, className, children, ...props }) {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code className={cn(className, 'font-mono text-xs')} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p
          className={cn(
            'mt-1 text-[10px]',
            isUser ? 'text-white/50' : 'text-white/30',
          )}
        >
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
```

---

## `src/components/chat/MessageInput.tsx`

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onStop, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-white/20">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Atlas... (Enter to send, Shift+Enter for newline)"
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
        disabled={disabled}
      />
      <button
        onClick={disabled ? onStop : handleSend}
        disabled={!disabled && !value.trim()}
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition',
          disabled
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : value.trim()
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'text-white/20',
        )}
      >
        {disabled ? <Square size={14} /> : <Send size={14} />}
      </button>
    </div>
  );
}
```

---

## `src/components/chat/StreamingCursor.tsx`

```tsx
export function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-white/60 align-middle" />
  );
}
```

---

## `src/components/setup/SetupWizard.tsx`

```tsx
'use client';

import { useState } from 'react';
import { RECOMMENDED_MODELS } from '@atlas/shared/constants';
import { ModelDownloadProgress } from '@/components/models/ModelDownloadProgress';
import { useModelsStore } from '@/store/models.store';
import { formatBytes } from '@atlas/shared/utils';

type Step = 'welcome' | 'pick-model' | 'downloading' | 'done';

export function SetupWizard() {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedModel, setSelectedModel] = useState(RECOMMENDED_MODELS[0]);
  const { pullModel, pullProgress } = useModelsStore();

  const handleDownload = async () => {
    setStep('downloading');
    await pullModel(selectedModel.name);
    setStep('done');
    // Mark setup complete via API
    await fetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'setup_complete', value: 'true' }),
      headers: { 'Content-Type': 'application/json' },
    });
    window.location.reload();
  };

  if (step === 'welcome') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a] px-8">
        <div className="text-center">
          <div className="mb-4 text-6xl">◎</div>
          <h1 className="text-3xl font-semibold text-white">Welcome to Atlas AI</h1>
          <p className="mt-3 text-white/50">
            A completely private AI assistant. Nothing leaves this device.
          </p>
        </div>
        <button
          onClick={() => setStep('pick-model')}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Get Started
        </button>
      </div>
    );
  }

  if (step === 'pick-model') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">Choose your AI model</h2>
          <p className="mt-2 text-sm text-white/40">
            You can download more models later. Start with the one that fits your device.
          </p>
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-2">
          {RECOMMENDED_MODELS.slice(0, 5).map((model) => (
            <button
              key={model.name}
              onClick={() => setSelectedModel(model)}
              className={cn(
                'flex items-center justify-between rounded-xl border px-5 py-4 text-left transition',
                selectedModel.name === model.name
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20',
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{model.displayName}</span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    model.tier === 'fast' ? 'bg-green-500/20 text-green-400' :
                    model.tier === 'balanced' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  )}>
                    {model.tier}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">{model.description}</p>
                <p className="mt-1 text-xs text-white/30">
                  Needs {model.ramRequiredGB}GB RAM
                </p>
              </div>
              <div className="text-right text-sm text-white/50">
                {model.sizeGB} GB
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleDownload}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Download {selectedModel.displayName} ({selectedModel.sizeGB} GB)
        </button>
      </div>
    );
  }

  if (step === 'downloading') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a]">
        <h2 className="text-xl font-semibold text-white">
          Downloading {selectedModel.displayName}...
        </h2>
        <div className="w-full max-w-md px-8">
          <ModelDownloadProgress progress={pullProgress} />
        </div>
        <p className="text-sm text-white/40">
          This only happens once. The model runs locally forever after.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
      <div className="text-5xl">✓</div>
      <h2 className="text-2xl font-semibold text-white">All set!</h2>
      <p className="text-white/50">Loading Atlas AI...</p>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

---

## `src/components/models/ModelDownloadProgress.tsx`

```tsx
import type { PullProgress } from '@atlas/shared/types';
import { formatPullProgress } from '@atlas/shared/utils';

interface ModelDownloadProgressProps {
  progress: PullProgress | null;
}

export function ModelDownloadProgress({ progress }: ModelDownloadProgressProps) {
  const pct = formatPullProgress(progress?.completed, progress?.total);
  const status = progress?.status ?? 'Preparing...';

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-white/60">{status}</span>
        <span className="text-white/60">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

---

## `src/hooks/useStreamingResponse.ts`

```tsx
import { useCallback } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useModelsStore } from '@/store/models.store';
import { API_ROUTES, STREAM_TIMEOUT_MS } from '@atlas/shared/constants';

export function useStreamingResponse(conversationId: string) {
  const {
    addUserMessage,
    startStreaming,
    appendStreamToken,
    finishStreaming,
    messages,
  } = useChatStore();
  const { activeModel } = useModelsStore();

  const sendMessage = useCallback(
    async (content: string) => {
      // 1. Add user message optimistically
      addUserMessage(content);
      startStreaming();

      try {
        const allMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content },
        ];

        const response = await fetch(`http://localhost:3001${API_ROUTES.chat}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            model: activeModel,
            messages: allMessages,
          }),
          signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.token) appendStreamToken(event.token);
              if (event.done) {
                finishStreaming(conversationId);
                return;
              }
              if (event.error) throw new Error(event.error);
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
        finishStreaming(conversationId);
      }
    },
    [conversationId, messages, activeModel, addUserMessage, startStreaming, appendStreamToken, finishStreaming],
  );

  return { sendMessage };
}
```

---

## `src/store/chat.store.ts`

```typescript
import { create } from 'zustand';
import type { Message, Conversation } from '@atlas/shared/types';
import { nanoid } from 'nanoid';

interface ChatStore {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  createConversation: (model?: string) => Promise<string>;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamToken: (token: string) => void;
  finishStreaming: (conversationId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversationId: null,
  isStreaming: false,
  streamingContent: '',

  loadConversations: async () => {
    const res = await fetch('http://localhost:3001/api/conversations');
    const conversations = await res.json();
    set({ conversations });
  },

  loadConversation: async (id) => {
    const res = await fetch(`http://localhost:3001/api/conversations/${id}`);
    const data = await res.json();
    set({ messages: data.messages, activeConversationId: id });
  },

  createConversation: async (model = 'llama3.2:3b') => {
    const res = await fetch('http://localhost:3001/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    const conversation = await res.json();
    set((s) => ({ conversations: [conversation, ...s.conversations] }));
    return conversation.id;
  },

  addUserMessage: (content) => {
    const message: Message = {
      id: nanoid(),
      conversation_id: get().activeConversationId ?? '',
      role: 'user',
      content,
      tokens_used: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, message] }));
  },

  startStreaming: () => set({ isStreaming: true, streamingContent: '' }),

  appendStreamToken: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),

  finishStreaming: (conversationId) => {
    const { streamingContent } = get();
    const assistantMessage: Message = {
      id: nanoid(),
      conversation_id: conversationId,
      role: 'assistant',
      content: streamingContent,
      tokens_used: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({
      isStreaming: false,
      streamingContent: '',
      messages: [...s.messages, assistantMessage],
    }));
  },
}));
```
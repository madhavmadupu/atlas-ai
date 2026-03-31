"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat.store";
import { useModelsStore } from "@/store/models.store";
import { useStreamingResponse } from "@/hooks/useStreamingResponse";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

const SUGGESTIONS = [
  { icon: "💡", text: "Explain a concept", prompt: "Explain quantum computing in simple terms" },
  { icon: "✍️", text: "Help me write", prompt: "Help me write a professional email to reschedule a meeting" },
  { icon: "🧠", text: "Brainstorm ideas", prompt: "Give me 5 creative project ideas for learning programming" },
  { icon: "🔍", text: "Analyze something", prompt: "What are the pros and cons of remote work?" },
];

export function ChatWindow() {
  const { messages, isStreaming, streamingContent, error, activeConversationId } =
    useChatStore();
  const activeModel = useModelsStore((s) => s.activeModel);
  const { sendMessage, stopGeneration } = useStreamingResponse();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            {/* Logo */}
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm">
                <svg
                  className="h-10 w-10 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-emerald-500" />
            </div>

            <h2 className="mb-1 text-xl font-semibold text-white">
              What can I help you with?
            </h2>
            <p className="mb-8 max-w-sm text-sm text-white/40">
              Running locally on your machine &middot; {activeModel}
            </p>

            {/* Suggestion chips */}
            <div className="grid w-full max-w-lg grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.prompt)}
                  className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.06]"
                >
                  <span className="text-lg">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/70 group-hover:text-white/90">
                      {s.text}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/30">
                      {s.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isStreaming && streamingContent && (
              <MessageBubble
                message={{
                  id: "streaming",
                  conversationId: activeConversationId ?? "",
                  role: "assistant",
                  content: streamingContent,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
              />
            )}

            {isStreaming && !streamingContent && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm bg-white/[0.03] px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400/60 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400/60 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400/60 [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-white/30">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5">
          <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      <MessageInput onSend={sendMessage} onStop={stopGeneration} />
    </div>
  );
}

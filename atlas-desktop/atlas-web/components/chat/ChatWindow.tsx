"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat.store";
import { useModelsStore } from "@/store/models.store";
import { useStreamingResponse } from "@/hooks/useStreamingResponse";
import { getPersona } from "@/lib/personas";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

export function ChatWindow() {
  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    activeConversationId,
    conversations,
  } = useChatStore();
  const activeModel = useModelsStore((s) => s.activeModel);
  const { sendMessage, stopGeneration } = useStreamingResponse();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve persona for the active conversation
  const conversation = conversations.find(
    (c) => c.id === activeConversationId,
  );
  const persona = getPersona(conversation?.personaId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Persona header bar (when conversation is active and has a non-general persona) */}
      {activeConversationId && persona.id !== "general" && (
        <div
          className="flex items-center gap-2.5 border-b px-4 py-2"
          style={{ borderColor: persona.accentColor + "15" }}
        >
          <span className="text-base">{persona.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: persona.accentColor }}
          >
            {persona.name}
          </span>
          <span className="text-xs text-white/25">{persona.description}</span>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            {/* Persona logo */}
            <div className="relative mb-6">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-3xl backdrop-blur-sm"
                style={{
                  background: `linear-gradient(135deg, ${persona.accentColor}20, ${persona.accentColor}10)`,
                }}
              >
                <span className="text-4xl">{persona.icon}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-emerald-500" />
            </div>

            <h2 className="mb-1 text-xl font-semibold text-white">
              {persona.id === "general"
                ? "What can I help you with?"
                : persona.name}
            </h2>
            <p className="mb-8 max-w-sm text-sm text-white/40">
              {persona.id === "general"
                ? `Running locally on your machine · ${activeModel}`
                : persona.description}
            </p>

            {/* Persona-specific suggestion chips */}
            <div className="grid w-full max-w-lg grid-cols-2 gap-2">
              {persona.suggestedPrompts.map((s) => (
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
              <div className="mb-4 flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm bg-white/[0.03] px-5 py-4">
                  <div className="flex gap-1.5">
                    <span
                      className="h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]"
                      style={{ backgroundColor: persona.accentColor + "99" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]"
                      style={{ backgroundColor: persona.accentColor + "99" }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]"
                      style={{ backgroundColor: persona.accentColor + "99" }}
                    />
                  </div>
                  <span className="text-xs text-white/30">
                    {persona.name} is thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
          <svg
            className="h-4 w-4 shrink-0 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      <MessageInput onSend={sendMessage} onStop={stopGeneration} />
    </div>
  );
}

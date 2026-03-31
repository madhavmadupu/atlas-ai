"use client";

import { useState, useRef, useCallback } from "react";
import { useChatStore } from "@/store/chat.store";
import { useModelsStore } from "@/store/models.store";

interface MessageInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
}

export function MessageInput({ onSend, onStop }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeModel = useModelsStore((s) => s.activeModel);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  return (
    <div className="border-t border-white/[0.06] bg-gradient-to-t from-[#0a0a0a] to-[#0a0a0a]/80 px-4 pb-4 pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 transition-colors focus-within:border-white/15 focus-within:bg-white/[0.05]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message Atlas AI..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-white placeholder-white/25 outline-none disabled:opacity-40"
            style={{ minHeight: "36px", maxHeight: "200px" }}
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/90 text-white transition-all hover:bg-red-500 active:scale-95"
              title="Stop generating"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:bg-transparent disabled:text-white/20"
              title="Send message"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <p className="text-[11px] text-white/20">
            {activeModel} &middot; Enter to send, Shift+Enter for new line
          </p>
          {input.length > 0 && (
            <p className="text-[11px] text-white/20">{input.length}</p>
          )}
        </div>
      </div>
    </div>
  );
}

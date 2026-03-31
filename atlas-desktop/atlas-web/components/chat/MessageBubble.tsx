"use client";

import type { Message } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-5 group",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
          <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white/[0.04] text-white/90 rounded-tl-sm border border-white/[0.06]",
        )}
      >
        <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.7]">
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-[18px] w-[2px] translate-y-[3px] animate-pulse rounded-full bg-indigo-400" />
          )}
        </div>

        {!isStreaming && (
          <p
            className={cn(
              "mt-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100",
              isUser ? "text-white/40 text-right" : "text-white/25",
            )}
          >
            {formatRelativeTime(message.createdAt)}
          </p>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="ml-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600/30">
          <svg className="h-4 w-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      )}
    </div>
  );
}

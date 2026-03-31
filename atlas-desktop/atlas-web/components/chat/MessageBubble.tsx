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
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white/5 text-white/90 rounded-tl-sm",
        )}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-white/60" />
          )}
        </div>

        {/* Timestamp */}
        {!isStreaming && (
          <p
            className={cn(
              "mt-1.5 text-[10px]",
              isUser ? "text-white/50" : "text-white/30",
            )}
          >
            {formatRelativeTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

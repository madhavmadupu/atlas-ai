"use client";

import { useOllamaStatus } from "@/hooks/useOllamaStatus";
import { cn } from "@/lib/utils";

export function TitleBar() {
  const { status } = useOllamaStatus();

  const statusColor =
    status === "connected"
      ? "bg-emerald-500"
      : status === "checking"
        ? "bg-yellow-500"
        : "bg-red-500";

  const statusLabel =
    status === "connected"
      ? "Ollama connected"
      : status === "checking"
        ? "Checking..."
        : "Ollama offline";

  return (
    <div
      className="flex h-9 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-4"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white/80">Atlas AI</span>
      </div>

      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5">
          <div className={cn("h-2 w-2 rounded-full", statusColor)} />
          <span className="text-xs text-white/40">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}

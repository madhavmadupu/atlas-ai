"use client";

import { useOllamaStatus } from "@/hooks/useOllamaStatus";
import { cn } from "@/lib/utils";

export function TitleBar() {
  const { status } = useOllamaStatus();

  const statusColor =
    status === "connected"
      ? "bg-emerald-500"
      : status === "checking"
        ? "bg-amber-400"
        : "bg-red-500";

  const statusLabel =
    status === "connected"
      ? "Online"
      : status === "checking"
        ? "Connecting..."
        : "Offline";

  return (
    <div
      className="flex h-10 items-center justify-between border-b border-white/[0.06] bg-[#0f0f0f] px-4"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Left: App title */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30">
          <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-white/60">Atlas AI</span>
      </div>

      {/* Right: Status */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
          <div className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
          <span className="text-[11px] font-medium text-white/35">{statusLabel}</span>
        </div>
      </div>
    </div>
  );
}

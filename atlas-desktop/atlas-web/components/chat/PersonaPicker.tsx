"use client";

import { useState } from "react";
import { PERSONAS, type Persona } from "@/lib/personas";

interface Props {
  open: boolean;
  onSelect: (personaId: string) => void;
  onClose: () => void;
}

export function PersonaPicker({ open, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = search.trim()
    ? PERSONAS.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase()),
      )
    : PERSONAS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col rounded-2xl border border-white/[0.08] bg-[#141414] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-semibold text-white">New Chat</h2>
            <p className="text-sm text-white/40 mt-0.5">
              Choose a specialized assistant
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-white/[0.04]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assistants..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/15 transition-colors"
            autoFocus
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onClick={() => {
                  setSearch("");
                  onSelect(persona.id);
                }}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-white/30">
                No assistants matching &ldquo;{search}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  onClick,
}: {
  persona: Persona;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.05]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: persona.accentColor + "20" }}
      >
        <span className="text-lg">{persona.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold group-hover:brightness-110"
          style={{ color: persona.accentColor }}
        >
          {persona.name}
        </p>
        <p className="mt-0.5 text-xs text-white/35 leading-relaxed line-clamp-2">
          {persona.description}
        </p>
      </div>
    </button>
  );
}

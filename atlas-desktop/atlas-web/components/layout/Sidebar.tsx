"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/store/chat.store";
import { useModelsStore } from "@/store/models.store";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import { getPersona } from "@/lib/personas";
import { PersonaPicker } from "@/components/chat/PersonaPicker";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
    loadConversations,
  } = useChatStore();
  const activeModel = useModelsStore((s) => s.activeModel);
  const pathname = usePathname();
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewChat = () => setPickerOpen(true);

  const handlePersonaSelected = async (personaId: string) => {
    setPickerOpen(false);
    await createConversation(activeModel, personaId);
  };

  return (
    <>
      <aside className="flex h-full w-64 flex-col bg-[#111111]">
        {/* Header + New Chat */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2.5 rounded-xl bg-white/[0.06] px-3.5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            New Chat
          </button>
        </div>

        {/* Section label */}
        {conversations.length > 0 && (
          <div className="px-5 pb-1.5 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/25">
              Recent
            </p>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center px-3 py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04]">
                <svg className="h-5 w-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <p className="text-xs text-white/25">
                Your conversations will appear here
              </p>
            </div>
          )}
          {conversations.map((conv) => {
            const persona = getPersona(conv.personaId);
            return (
              <div
                key={conv.id}
                className={cn(
                  "group flex cursor-pointer items-center rounded-xl px-3 py-2.5 mb-0.5 transition-all",
                  activeConversationId === conv.id
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/70",
                )}
                onClick={() => setActiveConversation(conv.id)}
              >
                {/* Persona icon */}
                <span className="mr-2.5 text-base" title={persona.name}>
                  {persona.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    {truncate(conv.title, 22)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: persona.accentColor + "99" }}
                    >
                      {persona.name}
                    </span>
                    <span className="text-[10px] text-white/15">·</span>
                    <span className="text-[10px] text-white/25">
                      {formatRelativeTime(conv.updatedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="ml-1 rounded-lg p-1.5 opacity-0 transition-all hover:bg-red-500/10 group-hover:opacity-100"
                  title="Delete"
                >
                  <svg className="h-3.5 w-3.5 text-white/30 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-white/[0.06] p-2">
          <Link
            href="/models"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all",
              pathname === "/models"
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:bg-white/[0.04] hover:text-white/60",
            )}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            Models
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all",
              pathname === "/settings"
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:bg-white/[0.04] hover:text-white/60",
            )}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </aside>

      {/* Persona Picker Modal */}
      <PersonaPicker
        open={pickerOpen}
        onSelect={handlePersonaSelected}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

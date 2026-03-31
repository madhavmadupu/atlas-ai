"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChatStore } from "@/store/chat.store";
import { useSettingsStore } from "@/store/settings.store";

export default function Home() {
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Read conversation ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setActiveConversation(id);
    }
  }, [setActiveConversation]);

  return (
    <AppShell>
      <ChatWindow />
    </AppShell>
  );
}

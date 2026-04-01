import { useRef, useCallback } from "react";
import { useChatStore } from "@/store/chat.store";
import { useModelsStore } from "@/store/models.store";
import { useSettingsStore } from "@/store/settings.store";
import { API_ROUTES, STREAM_TIMEOUT_MS } from "@/lib/constants";
import { getPersona } from "@/lib/personas";

export function useStreamingResponse() {
  const abortRef = useRef<AbortController | null>(null);

  const {
    activeConversationId,
    messages,
    addUserMessage,
    startStreaming,
    appendStreamToken,
    finishStreaming,
    setError,
    createConversation,
  } = useChatStore();

  const activeModel = useModelsStore((s) => s.activeModel);
  const systemPrompt = useSettingsStore((s) => s.settings.systemPrompt);

  const sendMessage = useCallback(
    async (content: string) => {
      let conversationId = activeConversationId;

      // Create a new conversation if none active
      if (!conversationId) {
        conversationId = await createConversation(activeModel);
      }

      // Add user message to store
      addUserMessage(content);
      startStreaming();

      // Resolve persona system prompt (overrides default if persona has one)
      const conversation = useChatStore
        .getState()
        .conversations.find((c) => c.id === conversationId);
      const persona = getPersona(conversation?.personaId);
      const resolvedSystemPrompt = persona.systemPrompt || systemPrompt;

      const allMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      try {
        abortRef.current = new AbortController();

        const res = await fetch(API_ROUTES.chat, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            model: activeModel,
            messages: allMessages,
            systemPrompt: resolvedSystemPrompt,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`Chat request failed: ${res.status}`);
        }

        if (!res.body) {
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.token) {
                appendStreamToken(event.token);
              }
              if (event.done) {
                finishStreaming();
                return;
              }
              if (event.error) {
                throw new Error(event.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue; // skip malformed JSON
              throw e;
            }
          }
        }

        // Stream ended without explicit done event
        finishStreaming();
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          finishStreaming();
          return;
        }
        setError(e instanceof Error ? e.message : "An error occurred");
      } finally {
        abortRef.current = null;
      }
    },
    [
      activeConversationId,
      activeModel,
      systemPrompt,
      messages,
      addUserMessage,
      startStreaming,
      appendStreamToken,
      finishStreaming,
      setError,
      createConversation,
    ],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, stopGeneration };
}

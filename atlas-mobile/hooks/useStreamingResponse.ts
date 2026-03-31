import { useRef, useCallback } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { routes } from '@/lib/api';

export function useStreamingResponse(conversationId: string | null) {
  const abortRef = useRef<AbortController | null>(null);

  const {
    messages,
    addUserMessage,
    startStreaming,
    appendStreamToken,
    finishStreaming,
    setError,
    createConversation,
  } = useChatStore();

  const defaultModel = useConnectionStore((s) => s.defaultModel);

  const sendMessage = useCallback(
    async (content: string) => {
      let convId = conversationId;
      const model = defaultModel ?? 'llama3.2:3b';

      if (!convId) {
        convId = await createConversation(model);
      }

      addUserMessage(content);
      startStreaming();

      const allMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      try {
        abortRef.current = new AbortController();

        const res = await fetch(routes.chat(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            conversationId: convId,
            model,
            messages: allMessages,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

        // React Native fetch returns the full body as text
        // For streaming, we poll the response text
        const text = await res.text();

        // Parse SSE lines from the complete response
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.token) appendStreamToken(event.token);
            if (event.error) throw new Error(event.error);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }

        finishStreaming();
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          finishStreaming();
          return;
        }
        setError(e instanceof Error ? e.message : 'Connection error');
      } finally {
        abortRef.current = null;
      }
    },
    [
      conversationId,
      defaultModel,
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

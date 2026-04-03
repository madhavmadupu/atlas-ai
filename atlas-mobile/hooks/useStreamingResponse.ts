import { useRef, useCallback } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { routes } from '@/lib/api';
import { localLlamaEngine } from '@/lib/local-llama-engine';
import { validateLocalChatModel } from '@/lib/model-validation';

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
  const inferenceProvider = useConnectionStore((s) => s.inferenceProvider);
  const localModelPath = useConnectionStore((s) => s.localModelPath);
  const localModelName = useConnectionStore((s) => s.localModelName);
  const localSettings = useConnectionStore((s) => s.localSettings);

  const sendMessage = useCallback(
    async (content: string) => {
      let convId = conversationId;
      const model =
        inferenceProvider === 'local'
          ? (localModelName ?? 'On-device GGUF')
          : (defaultModel ?? 'llama3.2:3b');

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
        if (inferenceProvider === 'local') {
          if (!localModelPath) {
            throw new Error(
              'No local model selected. Download or import one from the Models page.'
            );
          }

          const validation = validateLocalChatModel([localModelName, localModelPath]);
          if (!validation.isChatCapable) {
            throw new Error(validation.reason);
          }

          const localMessages = localSettings.systemPrompt.trim()
            ? [
                { role: 'system' as const, content: localSettings.systemPrompt.trim() },
                ...allMessages,
              ]
            : allMessages;

          await localLlamaEngine.chat(
            localModelPath,
            localMessages,
            localSettings,
            appendStreamToken
          );
          finishStreaming();
        } else {
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
        }
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
      inferenceProvider,
      localModelPath,
      localModelName,
      localSettings,
      messages,
      addUserMessage,
      startStreaming,
      appendStreamToken,
      finishStreaming,
      setError,
      createConversation,
    ]
  );

  const stopGeneration = useCallback(() => {
    if (inferenceProvider === 'local') {
      localLlamaEngine.stop();
      return;
    }
    abortRef.current?.abort();
  }, [inferenceProvider]);

  return { sendMessage, stopGeneration };
}

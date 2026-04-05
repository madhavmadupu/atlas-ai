import { useCallback, useRef } from 'react';
import { routes } from '@/lib/api';
import { localLlamaEngine } from '@/lib/local-llama-engine';
import { validateLocalChatModel } from '@/lib/model-validation';
import { buildAugmentedPrompt, extractAndStoreMemories } from '@/lib/memory-service';
import { useConnectionStore } from '@/store/connection.store';
import { useChatStore } from '@/store/chat.store';

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

  const defaultModel = useConnectionStore((state) => state.defaultModel);
  const inferenceProvider = useConnectionStore((state) => state.inferenceProvider);
  const localModelPath = useConnectionStore((state) => state.localModelPath);
  const localModelName = useConnectionStore((state) => state.localModelName);
  const localSettings = useConnectionStore((state) => state.localSettings);

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

      addUserMessage(content, convId);
      startStreaming();

      const allMessages = [
        ...messages.map((message) => ({ role: message.role, content: message.content })),
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

          // RAG: Augment system prompt with relevant user memories
          const basePrompt = localSettings.systemPrompt.trim() ||
            'You are Atlas AI, a private offline assistant.';
          const augmentedPrompt = await buildAugmentedPrompt(basePrompt, content);

          const localMessages = [
            { role: 'system' as const, content: augmentedPrompt },
            ...messages.map((message) => ({ role: message.role, content: message.content })),
            { role: 'user' as const, content },
          ];

          await localLlamaEngine.chat(
            localModelPath,
            localMessages,
            localSettings,
            appendStreamToken
          );
          finishStreaming();

          // RAG: Extract and store memories in background (don't block UI)
          const streamedContent = useChatStore.getState().messages.at(-1)?.content;
          if (streamedContent && localModelPath) {
            extractAndStoreMemories(
              localModelPath,
              localSettings,
              content,
              streamedContent,
              convId ?? undefined
            ).catch(() => {});
          }
        } else {
          abortRef.current = new AbortController();

          const response = await fetch(routes.chat(), {
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

          if (!response.ok) {
            throw new Error(`Chat failed: ${response.status}`);
          }

          const text = await response.text();

          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.token) appendStreamToken(event.token);
              if (event.error) throw new Error(event.error);
            } catch (error) {
              if (error instanceof SyntaxError) continue;
              throw error;
            }
          }

          finishStreaming();
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          finishStreaming();
          return;
        }
        setError(error instanceof Error ? error.message : 'Connection error');
      } finally {
        abortRef.current = null;
      }
    },
    [
      conversationId,
      defaultModel,
      inferenceProvider,
      localModelName,
      localModelPath,
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

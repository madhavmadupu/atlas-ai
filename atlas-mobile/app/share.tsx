import { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';

function buildSharedContent(params: { text?: string; url?: string; title?: string }): string {
  const parts: string[] = [];
  if (params.title?.trim()) parts.push(params.title.trim());
  if (params.text?.trim()) parts.push(params.text.trim());
  if (params.url?.trim()) parts.push(params.url.trim());
  return parts.join('\n\n').trim();
}

export default function ShareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ text?: string; url?: string; title?: string }>();
  const defaultModel = useConnectionStore((s) => s.defaultModel);
  const inferenceProvider = useConnectionStore((s) => s.inferenceProvider);
  const localModelName = useConnectionStore((s) => s.localModelName);
  const createConversation = useChatStore((s) => s.createConversation);

  const sharedContent = useMemo(
    () => buildSharedContent({ text: params.text, url: params.url, title: params.title }),
    [params.text, params.url, params.title]
  );

  useEffect(() => {
    let cancelled = false;

    async function go() {
      const model =
        inferenceProvider === 'local'
          ? (localModelName ?? 'On-device GGUF')
          : (defaultModel ?? 'llama3.2:3b');
      const id = await createConversation(model);
      if (cancelled) return;
      router.replace({ pathname: '/chat/[id]', params: { id, prefill: sharedContent } });
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [createConversation, defaultModel, inferenceProvider, localModelName, router, sharedContent]);

  return (
    <View className="flex-1 items-center justify-center bg-[#0a0a0a] px-6">
      <ActivityIndicator color="#ffffff" />
      <Text className="mt-4 text-sm text-white/60">Opening Atlas AI…</Text>
    </View>
  );
}

import { useEffect } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';
import { useModelStore } from '@/store/model.store';

export default function Index() {
  const router = useRouter();
  const {
    desktopIP,
    desktopPort,
    isConnected,
    inferenceProvider,
    localModelPath,
    localModelName,
    setInferenceProvider,
  } = useConnectionStore();
  const loadModels = useModelStore((s) => s.loadModels);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const goDesktop = () => {
    setInferenceProvider('desktop');
    router.push('/connect');
  };

  const goLocal = () => {
    setInferenceProvider('local');
    router.push('/models');
  };

  const canOpenChat =
    inferenceProvider === 'desktop' ? Boolean(desktopIP) && isConnected : Boolean(localModelPath);

  return (
    <ScrollView className="flex-1 bg-[#0a0a0a]" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-white">Run Atlas AI</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          className="rounded-xl bg-white/5 px-3 py-2">
          <Text className="text-sm font-semibold text-white/80">Settings</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/chat')}
        disabled={!canOpenChat}
        className={`mb-4 items-center rounded-xl py-3 ${
          canOpenChat ? 'bg-indigo-600 active:bg-indigo-700' : 'bg-white/10'
        }`}>
        <Text className={`text-sm font-semibold ${canOpenChat ? 'text-white' : 'text-white/40'}`}>
          Open Chat
        </Text>
      </Pressable>

      <View className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-lg font-semibold text-white">Desktop (Ollama)</Text>
        <Text className="mt-1 text-sm text-white/40">
          Connect over Wi-Fi. Enter the desktop IP/port to configure the API endpoint, then open
          chat.
        </Text>
        <Text className="mt-3 text-xs text-white/30">
          Saved endpoint: {desktopIP ?? 'not set'}:{desktopPort}
        </Text>
        <Pressable
          onPress={goDesktop}
          className="mt-4 items-center rounded-xl border border-blue-500/40 bg-blue-500/10 py-3">
          <Text className="text-sm font-semibold text-white">Configure Desktop</Text>
        </Pressable>
      </View>

      <View className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-lg font-semibold text-white">On-device (llama.cpp)</Text>
        <Text className="mt-1 text-sm text-white/40">
          Download or import a GGUF model. We store it locally and switch the inference provider.
        </Text>
        <Text className="mt-3 text-xs text-white/30">
          Active model: {localModelName ?? (localModelPath ? localModelPath.split('/').pop() : 'none')}
        </Text>
        <Pressable
          onPress={goLocal}
          className="mt-4 items-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3">
          <Text className="text-sm font-semibold text-white">Manage On-device Models</Text>
        </Pressable>
      </View>

      <Text className="mt-8 text-sm text-white/50">
        Switch between desktop and on-device anytime using Settings once you’ve configured the
        endpoint or GGUF path. The active mode is currently{' '}
        <Text className="font-semibold text-white">{inferenceProvider}</Text>.
      </Text>
    </ScrollView>
  );
}

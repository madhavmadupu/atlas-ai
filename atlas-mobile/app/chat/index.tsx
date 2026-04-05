import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ChatShellHeader } from '@/components/chat/ChatShellHeader';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageInput } from '@/components/chat/MessageInput';
import { ModelPicker } from '@/components/chat/ModelPicker';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { useModelStore } from '@/store/model.store';

const WELCOME_PROMPTS = [
  {
    title: 'Explain this codebase',
    prompt:
      'Give me a concise explanation of this project architecture and how mobile, desktop, and offline inference fit together.',
  },
  {
    title: 'Pick the best model',
    prompt: 'Recommend the best local GGUF for this phone and explain the tradeoffs clearly.',
  },
  {
    title: 'Plan the next task',
    prompt:
      'Turn my current app idea into an ordered implementation plan with the highest-impact next steps first.',
  },
  {
    title: 'Review this UI',
    prompt: 'Review this app UX like a senior product designer and suggest the top improvements.',
  },
];

export default function ChatHomeScreen() {
  const router = useRouter();
  const { conversations, createConversation, deleteConversation, loadConversations } =
    useChatStore();
  const {
    defaultModel,
    desktopModels,
    inferenceProvider,
    isConnected,
    localModelName,
    localModelPath,
    refreshDesktopModels,
    setDefaultModel,
    setInferenceProvider,
    setLocalModel,
  } = useConnectionStore();
  const { loadModels, models } = useModelStore();

  const [composerText, setComposerText] = useState('');
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      void loadModels();
      if (inferenceProvider === 'desktop' && isConnected) {
        void refreshDesktopModels();
      }
    }, [inferenceProvider, isConnected, loadConversations, loadModels, refreshDesktopModels])
  );

  const modelLabel =
    inferenceProvider === 'local'
      ? (localModelName ?? 'Choose model')
      : (defaultModel ?? 'Desktop model');

  const providerSubtitle =
    inferenceProvider === 'local'
      ? 'Offline on-device chat'
      : isConnected
        ? 'Desktop connected'
        : 'Desktop not connected';

  const recentConversations = useMemo(() => conversations.slice(0, 5), [conversations]);

  const ensureModeReady = useCallback(() => {
    if (inferenceProvider === 'local' && !localModelPath) {
      Alert.alert(
        'Select a model first',
        'Import or download a GGUF before starting offline chat.'
      );
      router.push('/models');
      return false;
    }

    if (inferenceProvider === 'desktop' && !isConnected) {
      Alert.alert(
        'Connect desktop first',
        'Configure the desktop endpoint before using desktop mode.'
      );
      router.push('/connect');
      return false;
    }

    return true;
  }, [inferenceProvider, isConnected, localModelPath, router]);

  const openModelPicker = useCallback(() => {
    if (inferenceProvider === 'desktop' && isConnected) {
      void refreshDesktopModels();
    }
    setModelPickerVisible(true);
  }, [inferenceProvider, isConnected, refreshDesktopModels]);

  const startConversation = useCallback(
    async (prompt?: string) => {
      if (!ensureModeReady()) return;

      const model = inferenceProvider === 'local' ? modelLabel : (defaultModel ?? modelLabel);
      const nextId = await createConversation(model);

      if (prompt?.trim()) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: nextId, prefill: prompt.trim(), autostart: '1' },
        });
      } else {
        router.push({ pathname: '/chat/[id]', params: { id: nextId } });
      }
    },
    [createConversation, defaultModel, ensureModeReady, inferenceProvider, modelLabel, router]
  );

  const handleSend = useCallback(
    async (content: string) => {
      const prompt = content.trim();
      if (!prompt) return;
      setComposerText('');
      await startConversation(prompt);
    },
    [startConversation]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        className="flex-1 bg-[#0a0a0a]">
        <ChatShellHeader
          title="Atlas AI"
          subtitle={providerSubtitle}
          modelLabel={modelLabel}
          onOpenSidebar={() => setSidebarVisible(true)}
          onOpenModelPicker={openModelPicker}
          onOpenSettings={() => router.push('/settings')}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}>
          <View className="items-center px-3 pt-8">
            <View className="mb-6 h-14 w-14 items-center justify-center rounded-3xl bg-indigo-500/15">
              <Ionicons name="sparkles-outline" size={26} color="#a5b4fc" />
            </View>
            <Text className="text-center text-4xl font-semibold text-white">
              What can I help with?
            </Text>
            <Text className="mt-4 text-center text-sm leading-6 text-white/45">
              Start typing below, pick a suggestion, or open your history from the sidebar. Current
              model: {modelLabel}.
            </Text>
          </View>

          <View className="mt-8">
            {WELCOME_PROMPTS.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => void startConversation(item.prompt)}
                className="mb-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <Text className="text-base font-semibold text-white">{item.title}</Text>
                <Text className="mt-2 text-sm leading-6 text-white/45">{item.prompt}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-white">Recent chats</Text>
              <Pressable onPress={() => setSidebarVisible(true)}>
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-white/40">
                  View all
                </Text>
              </Pressable>
            </View>

            {recentConversations.length === 0 ? (
              <Text className="text-sm leading-6 text-white/40">
                No chat history yet. Your new conversations will appear here and in the history
                drawer.
              </Text>
            ) : (
              recentConversations.map((conversation) => (
                <Pressable
                  key={conversation.id}
                  onPress={() =>
                    router.push({ pathname: '/chat/[id]', params: { id: conversation.id } })
                  }
                  className="border-white/8 mb-3 rounded-2xl border bg-black/20 px-4 py-3">
                  <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {conversation.title}
                  </Text>
                  <Text className="mt-1 text-xs text-white/35" numberOfLines={1}>
                    {conversation.model}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>

        <MessageInput
          value={composerText}
          onChangeText={setComposerText}
          onSend={(content) => void handleSend(content)}
          onStop={() => undefined}
          isStreaming={false}
          modelName={modelLabel}
        />

        <ChatSidebar
          visible={sidebarVisible}
          activeConversationId={null}
          conversations={conversations}
          currentModelLabel={modelLabel}
          inferenceProviderLabel={providerSubtitle}
          onClose={() => setSidebarVisible(false)}
          onDeleteConversation={(conversation) =>
            Alert.alert('Delete conversation', `Delete "${conversation.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteConversation(conversation.id);
                },
              },
            ])
          }
          onNewChat={() => void startConversation()}
          onOpenModels={() => {
            setSidebarVisible(false);
            router.push('/models');
          }}
          onOpenSettings={() => {
            setSidebarVisible(false);
            router.push('/settings');
          }}
          onSelectConversation={(conversationId) => {
            setSidebarVisible(false);
            router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
          }}
        />

        <ModelPicker
          visible={modelPickerVisible}
          inferenceProvider={inferenceProvider}
          desktopModels={desktopModels}
          currentDesktopModel={defaultModel}
          currentLocalModelPath={localModelPath}
          localModels={models}
          isDesktopConnected={isConnected}
          onClose={() => setModelPickerVisible(false)}
          onOpenModels={() => {
            setModelPickerVisible(false);
            router.push('/models');
          }}
          onOpenSettings={() => {
            setModelPickerVisible(false);
            router.push('/settings');
          }}
          onSetProvider={setInferenceProvider}
          onSelectDesktopModel={setDefaultModel}
          onSelectLocalModel={(model) => {
            setInferenceProvider('local');
            setLocalModel({ path: model.path, name: model.name });
          }}
        />
      </KeyboardAvoidingView>
    </>
  );
}

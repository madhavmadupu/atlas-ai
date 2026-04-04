import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChatShellHeader } from '@/components/chat/ChatShellHeader';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { ModelPicker } from '@/components/chat/ModelPicker';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import type { Message } from '@/lib/types';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { useModelStore } from '@/store/model.store';

function getRetryPrompt(messages: Message[], message: Message): string | null {
  if (message.role === 'user') return message.content;

  const currentIndex = messages.findIndex((item) => item.id === message.id);
  if (currentIndex < 0) return null;

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index].content;
    }
  }

  return null;
}

export default function ChatScreen() {
  const { id, prefill, autostart } = useLocalSearchParams<{
    id: string;
    prefill?: string;
    autostart?: string;
  }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<Message>>(null);
  const hasAutoStartedRef = useRef(false);

  const {
    conversations,
    createConversation,
    deleteConversation,
    error,
    isStreaming,
    loadConversations,
    messages,
    setActiveConversation,
    streamingContent,
  } = useChatStore();
  const { sendMessage, stopGeneration } = useStreamingResponse(id ?? null);
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    if (id) setActiveConversation(id);
  }, [id, setActiveConversation]);

  useEffect(() => {
    if (typeof prefill === 'string' && prefill.trim() && autostart !== '1') {
      setComposerText((current) => (current.trim().length > 0 ? current : prefill));
    }
  }, [autostart, prefill]);

  useEffect(() => {
    if (!id || autostart !== '1' || hasAutoStartedRef.current || typeof prefill !== 'string')
      return;
    const prompt = prefill.trim();
    if (!prompt) return;

    hasAutoStartedRef.current = true;
    setComposerText('');
    void sendMessage(prompt);
  }, [autostart, id, prefill, sendMessage]);

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      void loadModels();
      if (inferenceProvider === 'desktop' && isConnected) {
        void refreshDesktopModels();
      }
    }, [inferenceProvider, isConnected, loadConversations, loadModels, refreshDesktopModels])
  );

  const conversation = useMemo(
    () => conversations.find((item) => item.id === id) ?? null,
    [conversations, id]
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

  const displayMessages: Message[] = [
    ...messages,
    ...(isStreaming && streamingContent
      ? [
          {
            id: 'streaming',
            conversation_id: id ?? '',
            role: 'assistant' as const,
            content: streamingContent,
            created_at: new Date().toISOString(),
          },
        ]
      : []),
  ];

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

  const handleNewChat = useCallback(async () => {
    if (!ensureModeReady()) return;

    const model = inferenceProvider === 'local' ? modelLabel : (defaultModel ?? modelLabel);
    const nextId = await createConversation(model);
    setSidebarVisible(false);
    router.replace({ pathname: '/chat/[id]', params: { id: nextId } });
  }, [createConversation, defaultModel, ensureModeReady, inferenceProvider, modelLabel, router]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSidebarVisible(false);
      router.replace({ pathname: '/chat/[id]', params: { id: conversationId } });
    },
    [router]
  );

  const handleDeleteConversation = useCallback(
    (targetConversation: { id: string; title: string }) => {
      Alert.alert('Delete conversation', `Delete "${targetConversation.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteConversation(targetConversation.id);
            if (targetConversation.id === id) {
              router.replace('/chat');
            }
          },
        },
      ]);
    },
    [deleteConversation, id, router]
  );

  const handleCopySpecificMessage = useCallback(async (message: Message) => {
    await Clipboard.setStringAsync(message.content);
  }, []);

  const handleEditMessage = useCallback((message: Message) => {
    setComposerText(message.content);
    setEditingMessageId(message.id);
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleRetryMessage = useCallback(
    async (message: Message) => {
      if (isStreaming) return;
      const retryPrompt = getRetryPrompt(messages, message);
      if (!retryPrompt) {
        Alert.alert('Retry unavailable', 'No user prompt was found for this response.');
        return;
      }
      setEditingMessageId(null);
      setComposerText('');
      await sendMessage(retryPrompt);
    },
    [isStreaming, messages, sendMessage]
  );

  const handleShareMessage = useCallback(async (message: Message) => {
    await Share.share({ message: message.content });
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (!ensureModeReady()) return;
      setEditingMessageId(null);
      setComposerText('');
      await sendMessage(content);
    },
    [ensureModeReady, sendMessage]
  );

  const openModelPicker = useCallback(() => {
    if (inferenceProvider === 'desktop' && isConnected) {
      void refreshDesktopModels();
    }
    setModelPickerVisible(true);
  }, [inferenceProvider, isConnected, refreshDesktopModels]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        className="flex-1 bg-[#0a0a0a]">
        <ChatShellHeader
          title={conversation?.title ?? 'New chat'}
          subtitle={providerSubtitle}
          modelLabel={modelLabel}
          onOpenSidebar={() => setSidebarVisible(true)}
          onOpenModelPicker={openModelPicker}
          onOpenSettings={() => router.push('/settings')}
        />

        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 16,
            flexGrow: displayMessages.length === 0 ? 1 : undefined,
            justifyContent: displayMessages.length === 0 ? 'center' : undefined,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center px-6">
              <Text className="text-3xl font-semibold text-white">Start a new conversation</Text>
              <Text className="mt-3 text-center text-sm leading-6 text-white/45">
                Long press any message for copy, edit, and regenerate actions.
              </Text>
            </View>
          }
          ListFooterComponent={isStreaming && !streamingContent ? <TypingIndicator /> : null}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isStreaming={item.id === 'streaming'}
              onCopy={
                item.id === 'streaming' ? undefined : () => void handleCopySpecificMessage(item)
              }
              onEdit={
                item.id === 'streaming' || item.role !== 'user'
                  ? undefined
                  : () => handleEditMessage(item)
              }
              onRetry={item.id === 'streaming' ? undefined : () => void handleRetryMessage(item)}
              onShare={
                item.id === 'streaming' || item.role === 'user'
                  ? undefined
                  : () => void handleShareMessage(item)
              }
            />
          )}
        />

        {error ? (
          <View className="mx-4 mb-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <Text className="text-sm leading-6 text-red-300">{error}</Text>
          </View>
        ) : null}

        <MessageInput
          value={composerText}
          onChangeText={setComposerText}
          onSend={(content) => void handleSend(content)}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          isEditing={Boolean(editingMessageId)}
          onCancelEdit={() => {
            setEditingMessageId(null);
            setComposerText('');
          }}
        />

        <ChatSidebar
          visible={sidebarVisible}
          activeConversationId={id ?? null}
          conversations={conversations}
          currentModelLabel={modelLabel}
          inferenceProviderLabel={providerSubtitle}
          onClose={() => setSidebarVisible(false)}
          onDeleteConversation={handleDeleteConversation}
          onNewChat={() => void handleNewChat()}
          onOpenModels={() => {
            setSidebarVisible(false);
            router.push('/models');
          }}
          onOpenSettings={() => {
            setSidebarVisible(false);
            router.push('/settings');
          }}
          onSelectConversation={handleSelectConversation}
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

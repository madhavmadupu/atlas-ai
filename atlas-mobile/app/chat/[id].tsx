import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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

const EMPTY_PROMPTS = [
  {
    label: 'Explain the project',
    text: 'Explain this project architecture and how the desktop and offline mobile flows work.',
  },
  {
    label: 'Choose a model',
    text: 'Recommend the best local GGUF for this phone and explain the tradeoffs.',
  },
  {
    label: 'Review the UI',
    text: 'Review this mobile chat UI and suggest the highest-impact improvements.',
  },
];

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

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86400000;

  if (diff < dayMs && d.getDate() === now.getDate()) return 'Today';
  if (diff < 2 * dayMs) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].created_at);
  const curr = new Date(messages[index].created_at);
  return prev.toDateString() !== curr.toDateString();
}

function MoreMenu({
  visible,
  onClose,
  onRefresh,
  onDelete,
  onExport,
}: {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={menu.backdrop} onPress={onClose}>
        {Platform.OS === 'ios' ? (
          <View style={menu.glassWrap}>
            <BlurView intensity={60} tint="dark" style={menu.glass}>
              <View style={menu.glassOverlay}>
                <MenuItem icon="↻" label="Refresh" onPress={() => { onRefresh(); onClose(); }} />
                <View style={menu.divider} />
                <MenuItem icon="↗" label="Export Chat" onPress={() => { onExport(); onClose(); }} />
                <View style={menu.divider} />
                <MenuItem icon="✕" label="Delete Chat" onPress={() => { onDelete(); onClose(); }} destructive />
              </View>
            </BlurView>
          </View>
        ) : (
          <View style={menu.sheet}>
            <MenuItem icon="↻" label="Refresh" onPress={() => { onRefresh(); onClose(); }} />
            <View style={menu.divider} />
            <MenuItem icon="↗" label="Export Chat" onPress={() => { onExport(); onClose(); }} />
            <View style={menu.divider} />
            <MenuItem icon="✕" label="Delete Chat" onPress={() => { onDelete(); onClose(); }} destructive />
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [menu.item, pressed && menu.itemPressed]}>
      <Text style={[menu.icon, destructive && menu.destructiveText]}>{icon}</Text>
      <Text style={[menu.label, destructive && menu.destructiveText]}>{label}</Text>
    </Pressable>
  );
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
    setError,
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
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
    if (!id || autostart !== '1' || hasAutoStartedRef.current || typeof prefill !== 'string') {
      return;
    }

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

  const handleRefresh = useCallback(() => {
    if (id) {
      setActiveConversation(id);
    }
  }, [id, setActiveConversation]);

  const handleDelete = useCallback(() => {
    if (!conversation) return;
    Alert.alert('Delete Chat', 'Delete this conversation permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(conversation.id);
          router.replace('/chat');
        },
      },
    ]);
  }, [conversation, deleteConversation, router]);

  const handleExport = useCallback(async () => {
    if (messages.length === 0) {
      Alert.alert('Nothing to export', 'This conversation has no messages.');
      return;
    }

    const text = messages
      .map((message) => {
        const role = message.role === 'user' ? 'You' : 'Atlas AI';
        return `${role}:\n${message.content}`;
      })
      .join('\n\n---\n\n');

    await Share.share({
      message: text,
      title: 'Atlas AI Chat Export',
    });
  }, [messages]);

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

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollDown(distanceFromBottom > 150);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

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
          onOpenMoreMenu={() => setMenuVisible(true)}
        />

        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 16,
            flexGrow: displayMessages.length === 0 ? 1 : undefined,
            justifyContent: displayMessages.length === 0 ? 'center' : undefined,
          }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="items-center px-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl border border-indigo-500/20 bg-indigo-500/12">
                <Text className="text-sm font-extrabold tracking-tight text-indigo-300">AI</Text>
              </View>
              <Text className="text-3xl font-semibold text-white">Start a new conversation</Text>
              <Text className="mt-3 text-center text-sm leading-6 text-white/45">
                Send a prompt, use a suggestion, or switch models from the top bar.
              </Text>
              <View className="mt-6 w-full gap-3">
                {EMPTY_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt.label}
                    onPress={() => void handleSend(prompt.text)}
                    className="rounded-3xl border border-indigo-500/15 bg-indigo-500/8 px-4 py-4">
                    <Text className="text-sm font-semibold text-indigo-300">{prompt.label}</Text>
                    <Text className="mt-2 text-sm leading-6 text-white/70">{prompt.text}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={isStreaming && !streamingContent ? <TypingIndicator /> : null}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          renderItem={({ item, index }) => (
            <>
              {shouldShowDateSeparator(displayMessages, index) ? (
                <View className="mb-4 items-center">
                  <View className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    <Text className="text-[11px] font-medium uppercase tracking-[1.2px] text-white/35">
                      {formatDateLabel(item.created_at)}
                    </Text>
                  </View>
                </View>
              ) : null}
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
            </>
          )}
        />

        {showScrollDown && displayMessages.length > 0 ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.scrollDownWrap}>
            <Pressable onPress={scrollToBottom} style={styles.scrollDownBtn}>
              <Text style={styles.scrollDownArrow}>↓</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <Text style={styles.errorDismiss}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        <MessageInput
          value={composerText}
          onChangeText={setComposerText}
          onSend={(content) => void handleSend(content)}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          isEditing={Boolean(editingMessageId)}
          modelName={modelLabel}
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

        <MoreMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onRefresh={handleRefresh}
          onDelete={handleDelete}
          onExport={() => void handleExport()}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const menu = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 56,
    paddingRight: 16,
  },
  glassWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
    minWidth: 200,
  },
  glass: {
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(30,30,30,0.25)',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    minWidth: 200,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  icon: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    width: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 48,
  },
  destructiveText: {
    color: 'rgba(239,68,68,0.9)',
  },
});

const styles = StyleSheet.create({
  scrollDownWrap: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    zIndex: 10,
  },
  scrollDownBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  scrollDownArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(239,68,68,0.85)',
    width: 18,
    height: 18,
    textAlign: 'center',
    lineHeight: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.12)',
    overflow: 'hidden',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(239,68,68,0.85)',
    lineHeight: 18,
  },
  errorDismiss: {
    fontSize: 12,
    color: 'rgba(239,68,68,0.5)',
    paddingHorizontal: 4,
  },
});

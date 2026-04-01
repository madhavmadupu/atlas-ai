import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Modal,
  Share,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { Message } from '@/lib/types';

// ─── Suggested Prompts ──────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { label: 'Explain a concept', text: 'Explain how neural networks work in simple terms' },
  { label: 'Write code', text: 'Write a Python function to sort a list of dictionaries by key' },
  { label: 'Brainstorm ideas', text: 'Give me 5 creative project ideas for learning React Native' },
  { label: 'Debug help', text: 'Help me debug this error: ' },
];

// ─── Date Separator ─────────────────────────────────────────────────────────

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86400000;

  if (diff < dayMs && d.getDate() === now.getDate()) return 'Today';
  if (diff < 2 * dayMs) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].created_at);
  const curr = new Date(messages[index].created_at);
  return prev.toDateString() !== curr.toDateString();
}

// ─── More Menu ──────────────────────────────────────────────────────────────

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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [menu.item, pressed && menu.itemPressed]}
    >
      <Text style={[menu.icon, destructive && menu.destructiveText]}>{icon}</Text>
      <Text style={[menu.label, destructive && menu.destructiveText]}>{label}</Text>
    </Pressable>
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

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    setActiveConversation,
    loadMessages,
    deleteConversation,
    conversations,
  } = useChatStore();
  const defaultModel = useConnectionStore((s) => s.defaultModel);
  const { sendMessage, stopGeneration } = useStreamingResponse(id ?? null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Get conversation model name
  const conversation = conversations.find((c) => c.id === id);
  const modelName = conversation?.model ?? defaultModel ?? undefined;

  useEffect(() => {
    if (id) setActiveConversation(id);
  }, [id, setActiveConversation]);

  // Set header with model subtitle
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#ffffff' }}>Chat</Text>
          {modelName && (
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              {modelName}
            </Text>
          )}
        </View>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          hitSlop={8}
        >
          <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>
            ···
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, modelName]);

  const handleRefresh = useCallback(() => {
    if (id) loadMessages(id);
  }, [id, loadMessages]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Chat', 'Delete this conversation permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deleteConversation(id);
            router.back();
          }
        },
      },
    ]);
  }, [id, deleteConversation, router]);

  const handleExport = useCallback(async () => {
    if (messages.length === 0) {
      Alert.alert('Nothing to export', 'This conversation has no messages.');
      return;
    }

    const text = messages
      .map((m) => {
        const role = m.role === 'user' ? 'You' : 'Atlas AI';
        return `${role}:\n${m.content}`;
      })
      .join('\n\n---\n\n');

    try {
      await Share.share({
        message: text,
        title: 'Atlas AI Chat Export',
      });
    } catch {
      // User cancelled
    }
  }, [messages]);

  const displayMessages: Message[] = useMemo(() => [
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
  ], [messages, isStreaming, streamingContent, id]);

  const isEmpty = displayMessages.length === 0 && !isStreaming;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollDown(distanceFromBottom > 150);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSuggestedPrompt = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 56 : 80}
      style={s.container}
    >
      <MoreMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onRefresh={handleRefresh}
        onDelete={handleDelete}
        onExport={handleExport}
      />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        contentContainerStyle={[
          s.listContent,
          isEmpty && s.listContentEmpty,
        ]}
        renderItem={({ item, index }) => (
          <>
            {shouldShowDateSeparator(displayMessages, index) && (
              <View style={s.dateSeparator}>
                <View style={s.dateLine} />
                <Text style={s.dateText}>{formatDateLabel(item.created_at)}</Text>
                <View style={s.dateLine} />
              </View>
            )}
            <MessageBubble message={item} isStreaming={item.id === 'streaming'} />
          </>
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            {/* Logo */}
            <View style={s.emptyLogo}>
              <Text style={s.emptyLogoText}>Atlas</Text>
            </View>
            <Text style={s.emptyTitle}>How can I help you?</Text>
            <Text style={s.emptySubtitle}>
              Ask me anything. I run entirely on your local network.
            </Text>

            {/* Suggested prompts */}
            <View style={s.promptsGrid}>
              {SUGGESTED_PROMPTS.map((p) => (
                <Pressable
                  key={p.label}
                  style={({ pressed }) => [s.promptChip, pressed && s.promptChipPressed]}
                  onPress={() => handleSuggestedPrompt(p.text)}
                >
                  <Text style={s.promptLabel}>{p.label}</Text>
                  <Text style={s.promptText} numberOfLines={1}>{p.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={isStreaming && !streamingContent ? <TypingIndicator /> : null}
        onContentSizeChange={() => {
          if (displayMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      {/* Scroll to bottom FAB */}
      {showScrollDown && !isEmpty && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={s.scrollDownWrap}>
          <Pressable onPress={scrollToBottom} style={s.scrollDownBtn}>
            <Text style={s.scrollDownArrow}>↓</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Error */}
      {error && (
        <View style={s.errorBar}>
          <Text style={s.errorIcon}>!</Text>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => useChatStore.getState().setError(null)}>
            <Text style={s.errorDismiss}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isStreaming={isStreaming}
        modelName={modelName}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Date separators
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 10,
  },
  dateLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.3,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  emptyLogoText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(129,140,248,0.8)',
    letterSpacing: -0.3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  promptsGrid: {
    width: '100%',
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  promptChipPressed: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderColor: 'rgba(99,102,241,0.2)',
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(129,140,248,0.7)',
    marginBottom: 3,
  },
  promptText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },

  // Scroll to bottom
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

  // Error bar
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

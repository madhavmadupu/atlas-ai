import { useEffect, useRef } from 'react';
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChatStore } from '@/store/chat.store';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { Message } from '@/lib/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, isStreaming, streamingContent, error, setActiveConversation } = useChatStore();
  const { sendMessage, stopGeneration } = useStreamingResponse(id ?? null);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (id) setActiveConversation(id);
  }, [id, setActiveConversation]);

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

  const isEmpty = displayMessages.length === 0 && !isStreaming;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 56 : 0}
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
    >
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 8,
          ...(isEmpty ? { flexGrow: 1, justifyContent: 'center' as const } : {}),
        }}
        renderItem={({ item }) => (
          <MessageBubble message={item} isStreaming={item.id === 'streaming'} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: 'rgba(99,102,241,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: 'rgba(129,140,248,0.7)' }}>
                AI
              </Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              Start a conversation
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 20 }}>
              Type a message below to chat with Atlas AI
            </Text>
          </View>
        }
        ListFooterComponent={isStreaming && !streamingContent ? <TypingIndicator /> : null}
        onContentSizeChange={() => {
          if (displayMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      {/* Error */}
      {error && (
        <View
          style={{
            marginHorizontal: 12,
            marginBottom: 4,
            borderRadius: 12,
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderWidth: 0.5,
            borderColor: 'rgba(239,68,68,0.15)',
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 13, color: 'rgba(239,68,68,0.85)' }}>{error}</Text>
        </View>
      )}

      {/* Input */}
      <MessageInput onSend={sendMessage} onStop={stopGeneration} isStreaming={isStreaming} />
    </KeyboardAvoidingView>
  );
}

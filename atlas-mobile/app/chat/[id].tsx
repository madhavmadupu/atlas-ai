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

  // Build the display list: real messages + streaming message
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1 bg-[#0a0a0a]"
    >
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isStreaming={item.id === 'streaming'}
          />
        )}
        ListFooterComponent={
          isStreaming && !streamingContent ? <TypingIndicator /> : null
        }
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        onLayout={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {error && (
        <View className="mx-4 mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2">
          <Text className="text-sm text-red-400">{error}</Text>
        </View>
      )}

      <MessageInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isStreaming={isStreaming}
      />
    </KeyboardAvoidingView>
  );
}

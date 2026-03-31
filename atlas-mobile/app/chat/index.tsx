import { useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ChatListScreen() {
  const router = useRouter();
  const { conversations, loadConversations, createConversation, deleteConversation } =
    useChatStore();
  const defaultModel = useConnectionStore((s) => s.defaultModel);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const handleNewChat = async () => {
    const model = defaultModel ?? 'llama3.2:3b';
    const id = await createConversation(model);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Conversation', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteConversation(id),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      {/* New Chat Button */}
      <View className="px-4 pb-3 pt-2">
        <Pressable
          onPress={handleNewChat}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
        >
          <Text className="text-lg text-white">+</Text>
          <Text className="text-base font-semibold text-white">New Chat</Text>
        </Pressable>
      </View>

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-lg font-semibold text-white/60">No conversations yet</Text>
          <Text className="text-center text-sm text-white/30">
            Tap "New Chat" to start a conversation with Atlas AI.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
              onLongPress={() => handleDelete(item.id, item.title)}
              className="mb-1.5 rounded-xl border border-white/5 bg-white/5 px-4 py-3 active:bg-white/10"
            >
              <Text className="text-sm font-medium text-white" numberOfLines={1}>
                {item.title}
              </Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-xs text-white/30">{item.model}</Text>
                <Text className="text-xs text-white/30">
                  {formatRelativeTime(item.updated_at)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Bottom nav */}
      <View className="flex-row border-t border-white/10 bg-[#111111] px-4 py-3">
        <Pressable
          onPress={() => router.push('/settings')}
          className="flex-1 items-center py-1"
        >
          <Text className="text-xs text-white/50">Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

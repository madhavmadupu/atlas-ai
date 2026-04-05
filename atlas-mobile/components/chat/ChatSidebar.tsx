import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Conversation } from '@/lib/types';

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(iso).toLocaleDateString();
}

interface ChatSidebarProps {
  activeConversationId?: string | null;
  conversations: Conversation[];
  currentModelLabel: string;
  inferenceProviderLabel: string;
  onClose: () => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onOpenModels: () => void;
  onOpenSettings: () => void;
  onSelectConversation: (conversationId: string) => void;
  visible: boolean;
}

export function ChatSidebar({
  activeConversationId,
  conversations,
  currentModelLabel,
  inferenceProviderLabel,
  onClose,
  onDeleteConversation,
  onNewChat,
  onOpenModels,
  onOpenSettings,
  onSelectConversation,
  visible,
}: ChatSidebarProps) {
  const [query, setQuery] = useState('');
  const filteredConversations = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return conversations;
    return conversations.filter((conversation) => {
      return (
        conversation.title.toLowerCase().includes(trimmed) ||
        conversation.model.toLowerCase().includes(trimmed)
      );
    });
  }, [conversations, query]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 flex-row">
        <View className="w-[84%] max-w-[360px] border-r border-white/10 bg-[#101014] px-4 pb-6 pt-5">
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-semibold text-white">Atlas AI</Text>
              <Text className="mt-1 text-xs leading-5 text-white/40">
                {inferenceProviderLabel} · {currentModelLabel}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-2xl bg-white/5">
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>

          <Pressable
            onPress={onNewChat}
            className="mb-5 flex-row items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3">
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">New chat</Text>
          </Pressable>

          <View className="mb-4 flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Ionicons name="search-outline" size={16} color="#ffffff" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search history"
              placeholderTextColor="rgba(255,255,255,0.3)"
              className="flex-1 py-2 text-sm text-white"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>
            ) : null}
          </View>

          <Text className="mb-3 text-xs font-medium uppercase tracking-[1.4px] text-white/35">
            History
          </Text>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {filteredConversations.length === 0 ? (
              <View className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-4">
                <Text className="text-sm leading-6 text-white/40">
                  {query
                    ? 'No conversations match that search.'
                    : 'Your conversations appear here once you start chatting.'}
                </Text>
              </View>
            ) : (
              filteredConversations.map((conversation) => {
                const active = conversation.id === activeConversationId;
                return (
                  <View
                    key={conversation.id}
                    className={`mb-2 rounded-3xl border p-4 ${
                      active ? 'border-indigo-500/40 bg-indigo-500/15' : 'border-white/8 bg-white/5'
                    }`}>
                    <View className="flex-row items-start gap-3">
                      <Pressable
                        onPress={() => onSelectConversation(conversation.id)}
                        className="flex-1">
                        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                          {conversation.title}
                        </Text>
                        <Text className="mt-1 text-xs text-white/35" numberOfLines={1}>
                          {conversation.model}
                        </Text>
                        <Text className="mt-2 text-[11px] text-white/25">
                          {formatRelativeTime(conversation.updated_at)}
                        </Text>
                      </Pressable>
                      <Pressable
                        hitSlop={8}
                        onPress={() => onDeleteConversation(conversation)}
                        className="h-8 w-8 items-center justify-center rounded-xl bg-black/20">
                        <Ionicons name="trash-outline" size={15} color="#fca5a5" />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onOpenModels}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3">
              <Ionicons name="albums-outline" size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Models</Text>
            </Pressable>
            <Pressable
              onPress={onOpenSettings}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3">
              <Ionicons name="settings-outline" size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Settings</Text>
            </Pressable>
          </View>
        </View>
        <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      </View>
    </Modal>
  );
}

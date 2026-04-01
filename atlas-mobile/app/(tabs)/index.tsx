import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { getPersona } from '@/lib/personas';
import { PersonaPicker } from '@/components/chat/PersonaPicker';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

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
  const { defaultModel, isConnected } = useConnectionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const persona = getPersona(c.persona_id);
      return c.title.toLowerCase().includes(q) || persona.name.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleNewChat = () => setPickerVisible(true);

  const handlePersonaSelected = async (personaId: string) => {
    setPickerVisible(false);
    const model = defaultModel ?? 'llama3.2:3b';
    const id = await createConversation(model, personaId);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Conversation', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(id) },
    ]);
  };

  const handleClearAll = () => {
    if (conversations.length === 0) return;
    Alert.alert(
      'Clear All',
      `Delete all ${conversations.length} conversations? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            for (const c of conversations) {
              await deleteConversation(c.id);
            }
          },
        },
      ],
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#0a0a0a]" style={{ paddingTop: insets.top }}>
      {/* Status + actions bar */}
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
        <View className="flex-row items-center gap-1.5">
          <View
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
          />
          <Text className="text-[11px] text-white/30">
            {isConnected ? 'Connected' : 'Offline'}
          </Text>
          <Text className="text-[11px] text-white/15"> · </Text>
          <Text className="text-[11px] text-white/20">{defaultModel ?? 'No model'}</Text>
        </View>
        {conversations.length > 0 && (
          <Pressable onPress={handleClearAll}>
            <Text className="text-[11px] font-medium text-red-400/60">Clear All</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View className="px-4 pb-3">
        <View className="flex-row items-center rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5">
          <Text className="mr-2 text-[13px] text-white/20">⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            className="flex-1 py-2.5 text-[13px] text-white"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text className="text-white/30">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* New Chat */}
      <View className="px-4 pb-4">
        <Pressable
          onPress={handleNewChat}
          className="flex-row items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 py-3.5 active:bg-indigo-500"
        >
          <View className="h-5 w-5 items-center justify-center rounded-lg bg-white/20">
            <Text className="text-[13px] font-bold text-white">+</Text>
          </View>
          <Text className="text-[15px] font-semibold text-white">New Chat</Text>
        </Pressable>
      </View>

      {/* Section label */}
      {filtered.length > 0 && (
        <View className="flex-row items-center justify-between px-5 pb-2">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-white/20">
            Conversations
          </Text>
          <Text className="text-[11px] text-white/15">{filtered.length}</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filtered.length === 0
            ? { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 40 }
            : { paddingHorizontal: 16, paddingBottom: 20 }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={
          <View className="items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
              <Text className="text-lg font-bold text-white/15">{search ? '?' : 'AI'}</Text>
            </View>
            <Text className="mb-1 text-base font-semibold text-white/50">
              {search ? 'No results' : 'No conversations yet'}
            </Text>
            <Text className="text-center text-sm leading-5 text-white/25">
              {search
                ? `No conversations matching "${search}"`
                : 'Tap "New Chat" to get started.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const persona = getPersona(item.persona_id);
          const useGlass = isLiquidGlassAvailable();
          const CardWrapper = useGlass ? GlassView : View;
          const cardProps = useGlass
            ? { glassEffectStyle: 'regular' as const, colorScheme: 'dark' as const, isInteractive: true, style: { borderRadius: 20, marginBottom: 8 } }
            : { className: 'mb-2 rounded-2xl border border-white/[0.04] bg-white/[0.03]' };

          return (
            <Pressable
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
              onLongPress={() => handleDelete(item.id, item.title)}
            >
              <CardWrapper {...(cardProps as any)}>
                <View className="flex-row items-center px-4 py-3.5">
                  {/* Persona avatar */}
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: persona.accentBg }}
                  >
                    <Text style={{ fontSize: 18 }}>{persona.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-medium text-white" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Text
                        className="text-[11px] font-medium"
                        style={{ color: persona.accentColor }}
                      >
                        {persona.name}
                      </Text>
                      <View className="h-0.5 w-0.5 rounded-full bg-white/15" />
                      <Text className="text-[11px] text-white/25">{item.model}</Text>
                      <View className="h-0.5 w-0.5 rounded-full bg-white/15" />
                      <Text className="text-[11px] text-white/25">
                        {formatRelativeTime(item.updated_at)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-lg text-white/10">›</Text>
                </View>
              </CardWrapper>
            </Pressable>
          );
        }}
      />

      {/* Persona Picker Modal */}
      <PersonaPicker
        visible={pickerVisible}
        onSelect={handlePersonaSelected}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

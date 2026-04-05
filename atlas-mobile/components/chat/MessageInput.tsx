import { Ionicons } from '@expo/vector-icons';
import { View, TextInput, Pressable, Text } from 'react-native';

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  onChangeText: (value: string) => void;
  onCancelEdit?: () => void;
  value: string;
  isEditing?: boolean;
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  onChangeText,
  onCancelEdit,
  value,
  isEditing,
}: Props) {
  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
  };

  return (
    <View className="bg-transparent px-4 pb-6 pt-3">
      {isEditing ? (
        <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="create-outline" size={16} color="#fcd34d" />
            <Text className="text-sm font-medium text-amber-100">Editing previous prompt</Text>
          </View>
          <Pressable onPress={onCancelEdit}>
            <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-amber-100">
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row items-end gap-2 rounded-[32px] border border-white/10 bg-slate-800/60 p-2 shadow-lg shadow-black/20">
        <Pressable className="h-[44px] w-[44px] items-center justify-center rounded-full bg-white/5 disabled:opacity-50">
          <Ionicons name="add" size={24} color="#94a3b8" />
        </Pressable>
        <Pressable className="h-[44px] w-[44px] items-center justify-center rounded-full bg-white/5 disabled:opacity-50">
          <Ionicons name="camera-outline" size={22} color="#94a3b8" />
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Message Atlas AI..."
          placeholderTextColor="#64748b"
          editable={!isStreaming}
          multiline
          maxLength={4000}
          className="mb-0.5 max-h-[140px] min-h-[44px] flex-1 px-2 py-3 text-sm text-white"
          style={{ textAlignVertical: 'top' }}
        />

        {isStreaming ? (
          <Pressable
            onPress={onStop}
            className="h-[44px] w-[44px] items-center justify-center rounded-full bg-red-600 active:bg-red-700">
            <View className="h-4 w-4 rounded-sm bg-white" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!value.trim()}
            className={`h-[44px] w-[44px] items-center justify-center rounded-full ${
              value.trim() ? 'bg-indigo-600 active:bg-indigo-700' : 'bg-white/5'
            }`}>
            <Ionicons
              name="arrow-up"
              size={20}
              color={value.trim() ? '#ffffff' : '#64748b'}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

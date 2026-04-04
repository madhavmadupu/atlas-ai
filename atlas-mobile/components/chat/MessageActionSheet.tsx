import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import type { Message } from '@/lib/types';

interface MessageActionSheetProps {
  message: Message | null;
  onClose: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onRetry: () => void;
  visible: boolean;
}

export function MessageActionSheet({
  message,
  onClose,
  onCopy,
  onEdit,
  onRetry,
  visible,
}: MessageActionSheetProps) {
  if (!message) return null;

  const isUser = message.role === 'user';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-t-[32px] border-t border-white/10 bg-[#121216] px-5 pb-10 pt-4">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-white/20" />
          </View>

          <Text className="mb-1 text-lg font-semibold text-white">
            {isUser ? 'Prompt actions' : 'Message actions'}
          </Text>
          <Text className="mb-5 text-sm leading-6 text-white/40" numberOfLines={2}>
            {message.content}
          </Text>

          <Pressable
            onPress={onCopy}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <Ionicons name="copy-outline" size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Copy</Text>
          </Pressable>

          {isUser && onEdit ? (
            <Pressable
              onPress={onEdit}
              className="mb-3 flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <Ionicons name="create-outline" size={18} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Edit and resend</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onRetry}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <Ionicons name="refresh-outline" size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">
              {isUser ? 'Send again' : 'Regenerate response'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="mt-2 flex-row items-center justify-center rounded-2xl bg-white/10 px-4 py-4">
            <Text className="text-sm font-semibold text-white">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

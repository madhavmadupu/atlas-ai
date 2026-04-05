import { Pressable, Text, View } from 'react-native';
import type { Message } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  message: Message;
  isStreaming?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onRetry?: () => void;
  onShare?: () => void;
}

export function MessageBubble({ message, isStreaming, onCopy, onEdit, onRetry, onShare }: Props) {
  const isUser = message.role === 'user';
  const bubbleClass = isUser
    ? 'rounded-tr-sm bg-indigo-600'
    : 'rounded-tl-sm border border-white/5 bg-slate-800/80';

  return (
    <View className={`mb-6 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View className={`max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser ? (
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15">
              <Ionicons name="sparkles-outline" size={14} color="#6ee7b7" />
            </View>
            <Text className="text-xs font-medium uppercase tracking-[1.2px] text-white/35">
              Atlas
            </Text>
          </View>
        ) : null}

        <Pressable>
          <View className={`rounded-3xl px-4 py-3 ${bubbleClass}`}>
            <Text
              selectable
              className={`text-sm leading-6 ${isUser ? 'text-white' : 'text-white/90'}`}>
              {message.content}
              {isStreaming && '▎'}
            </Text>
            {!isStreaming && (
              <Text className={`mt-2 text-[10px] ${isUser ? 'text-white/55' : 'text-white/30'}`}>
                {formatTime(message.created_at)}
              </Text>
            )}
          </View>
        </Pressable>

        {isUser ? (
          <Text className="mt-2 text-[11px] font-medium uppercase tracking-[1.2px] text-white/25">
            You
          </Text>
        ) : null}

        {!isStreaming ? (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {onCopy ? (
              <Pressable
                onPress={onCopy}
                className="border-white/8 rounded-full border bg-white/5 px-3 py-2">
                <Text className="text-[11px] font-medium text-white/75">Copy</Text>
              </Pressable>
            ) : null}
            {onEdit ? (
              <Pressable
                onPress={onEdit}
                className="border-white/8 rounded-full border bg-white/5 px-3 py-2">
                <Text className="text-[11px] font-medium text-white/75">Edit</Text>
              </Pressable>
            ) : null}
            {onRetry ? (
              <Pressable
                onPress={onRetry}
                className="border-white/8 rounded-full border bg-white/5 px-3 py-2">
                <Text className="text-[11px] font-medium text-white/75">
                  {isUser ? 'Resend' : 'Regenerate'}
                </Text>
              </Pressable>
            ) : null}
            {onShare ? (
              <Pressable
                onPress={onShare}
                className="border-white/8 rounded-full border bg-white/5 px-3 py-2">
                <Text className="text-[11px] font-medium text-white/75">Share</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

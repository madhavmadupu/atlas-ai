import { View, Text } from 'react-native';
import type { Message } from '@/lib/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <View className={`mb-3 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? 'rounded-tr-sm bg-indigo-600' : 'rounded-tl-sm bg-white/5'
        }`}
      >
        <Text className={`text-sm leading-6 ${isUser ? 'text-white' : 'text-white/90'}`}>
          {message.content}
          {isStreaming && '▎'}
        </Text>
        {!isStreaming && (
          <Text className={`mt-1 text-[10px] ${isUser ? 'text-white/50' : 'text-white/30'}`}>
            {formatTime(message.created_at)}
          </Text>
        )}
      </View>
    </View>
  );
}

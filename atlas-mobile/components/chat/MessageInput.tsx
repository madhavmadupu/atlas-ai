import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  initialValue?: string;
}

export function MessageInput({ onSend, onStop, isStreaming, initialValue }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!initialValue) return;
    setInput((prev) => (prev.trim().length === 0 ? initialValue : prev));
  }, [initialValue]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <View className="border-t border-white/10 bg-[#0a0a0a] px-4 pb-6 pt-3">
      <View className="flex-row items-end gap-3">
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Message Atlas AI..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          editable={!isStreaming}
          multiline
          maxLength={4000}
          className="max-h-[120px] min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
          style={{ textAlignVertical: 'top' }}
        />

        {isStreaming ? (
          <Pressable
            onPress={onStop}
            className="h-[44px] w-[44px] items-center justify-center rounded-xl bg-red-600 active:bg-red-700">
            <View className="h-4 w-4 rounded-sm bg-white" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!input.trim()}
            className={`h-[44px] w-[44px] items-center justify-center rounded-xl ${
              input.trim() ? 'bg-indigo-600 active:bg-indigo-700' : 'bg-white/10'
            }`}>
            <Text className={`text-lg ${input.trim() ? 'text-white' : 'text-white/30'}`}>↑</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

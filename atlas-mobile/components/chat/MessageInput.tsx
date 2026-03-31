import { useState, useRef } from 'react';
import { View, TextInput, Pressable, Text, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function MessageInput({ onSend, onStop, isStreaming }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
  };

  const hasText = input.trim().length > 0;

  const InputContent = (
    <View style={styles.contentWrap}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Message Atlas AI..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          editable={!isStreaming}
          multiline
          maxLength={4000}
          style={styles.textInput}
        />

        {isStreaming ? (
          <Pressable onPress={onStop} style={styles.stopBtn}>
            <View style={styles.stopIcon} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!hasText}
            style={[styles.sendBtn, hasText ? styles.sendActive : styles.sendInactive]}
          >
            <Text style={[styles.sendText, hasText ? styles.sendTextActive : styles.sendTextInactive]}>
              ↑
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <BlurView intensity={80} tint="dark" style={styles.glass}>
          <View style={styles.glassOverlay}>{InputContent}</View>
        </BlurView>
      </View>
    );
  }

  return <View style={[styles.container, styles.fallback]}>{InputContent}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  glass: {
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(10,10,10,0.4)',
  },
  fallback: {
    backgroundColor: '#0a0a0a',
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 15,
    color: '#ffffff',
    textAlignVertical: 'center',
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: {
    backgroundColor: 'rgba(99,102,241,1)',
  },
  sendInactive: {
    backgroundColor: 'transparent',
  },
  sendText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sendTextActive: {
    color: '#fff',
  },
  sendTextInactive: {
    color: 'rgba(255,255,255,0.12)',
  },
});

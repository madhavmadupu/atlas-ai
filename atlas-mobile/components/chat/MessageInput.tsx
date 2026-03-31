import { useState, useRef, useCallback, useEffect } from 'react';
import { View, TextInput, Pressable, Text, Platform, StyleSheet, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function MessageInput({ onSend, onStop, isStreaming }: Props) {
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
    setInputHeight(36);
  }, [input, isStreaming, onSend]);

  const hasText = input.trim().length > 0;

  const onContentSizeChange = useCallback((e: any) => {
    const h = e.nativeEvent.contentSize.height;
    setInputHeight(Math.min(Math.max(h, 36), 100));
  }, []);

  // When keyboard is open, no bottom padding needed (keyboard fills that space)
  // When keyboard is closed, use safe area inset for home indicator
  const bottomPad = keyboardVisible ? 4 : Math.max(insets.bottom, 8);

  const InputContent = (
    <View style={[styles.contentWrap, { paddingBottom: bottomPad }]}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          onContentSizeChange={onContentSizeChange}
          placeholder="Message Atlas AI..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          editable={!isStreaming}
          multiline
          maxLength={4000}
          style={[styles.textInput, { height: inputHeight }]}
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
      <BlurView intensity={80} tint="dark" style={styles.container}>
        <View style={styles.glassOverlay}>{InputContent}</View>
      </BlurView>
    );
  }

  return <View style={[styles.container, styles.fallback]}>{InputContent}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  glassOverlay: {
    backgroundColor: 'rgba(10,10,10,0.4)',
  },
  fallback: {
    backgroundColor: '#0a0a0a',
  },
  contentWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
    color: '#ffffff',
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: '700',
  },
  sendTextActive: {
    color: '#fff',
  },
  sendTextInactive: {
    color: 'rgba(255,255,255,0.1)',
  },
});

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  Platform,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  modelName?: string;
}

export function MessageInput({ onSend, onStop, isStreaming, modelName }: Props) {
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const sendScale = useSharedValue(1);
  const sendOpacity = useSharedValue(0);

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

  const hasText = input.trim().length > 0;

  useEffect(() => {
    sendOpacity.value = withTiming(hasText ? 1 : 0.3, { duration: 150 });
    if (hasText) {
      sendScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [hasText, sendOpacity, sendScale]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
    sendScale.value = withSpring(0.85, { damping: 8 }, () => {
      sendScale.value = withSpring(1, { damping: 12 });
    });
    onSend(trimmed);
    setInput('');
    setInputHeight(36);
  }, [input, isStreaming, onSend, sendScale]);

  const handleStop = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
    onStop();
  }, [onStop]);

  const onContentSizeChange = useCallback((e: any) => {
    const h = e.nativeEvent.contentSize.height;
    setInputHeight(Math.min(Math.max(h, 36), 120));
  }, []);

  const bottomPad = keyboardVisible ? 4 : Math.max(insets.bottom, 8);

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
    opacity: sendOpacity.value,
  }));

  const charCount = input.length;
  const showCharCount = charCount > 200;

  const InputContent = (
    <View style={[styles.contentWrap, { paddingBottom: bottomPad }]}>
      {/* Model indicator */}
      {modelName && !keyboardVisible && (
        <View style={styles.modelRow}>
          <View style={styles.modelDot} />
          <Text style={styles.modelText}>{modelName}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          onContentSizeChange={onContentSizeChange}
          placeholder="Message Atlas AI..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          editable={!isStreaming}
          multiline
          maxLength={4000}
          style={[styles.textInput, { height: inputHeight }]}
          keyboardAppearance="dark"
          returnKeyType="default"
        />

        {isStreaming ? (
          <Pressable onPress={handleStop} style={styles.stopBtn}>
            <View style={styles.stopIcon} />
          </Pressable>
        ) : (
          <AnimatedPressable
            onPress={handleSend}
            disabled={!hasText}
            style={[styles.sendBtn, hasText && styles.sendActive, sendAnimStyle]}
          >
            <Text style={[styles.sendArrow, hasText && styles.sendArrowActive]}>↑</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Footer row: char count + privacy note */}
      <View style={styles.footerRow}>
        {showCharCount ? (
          <Text style={[styles.charCount, charCount > 3500 && styles.charCountWarn]}>
            {charCount}/4000
          </Text>
        ) : (
          <View />
        )}
        <Text style={styles.privacyNote}>Runs locally on your network</Text>
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
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  glassOverlay: {
    backgroundColor: 'rgba(10,10,10,0.4)',
  },
  fallback: {
    backgroundColor: '#141414',
  },
  contentWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  modelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(99,102,241,0.6)',
  },
  modelText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    lineHeight: 22,
  },
  stopBtn: {
    width: 34,
    height: 34,
    borderRadius: 13,
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
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sendActive: {
    backgroundColor: '#4f46e5',
  },
  sendArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.15)',
  },
  sendArrowActive: {
    color: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  charCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    fontVariant: ['tabular-nums'],
  },
  charCountWarn: {
    color: 'rgba(251,191,36,0.6)',
  },
  privacyNote: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.12)',
  },
});

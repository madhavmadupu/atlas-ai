<<<<<<< HEAD
import { Ionicons } from '@expo/vector-icons';
import { View, TextInput, Pressable, Text } from 'react-native';
=======
import { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  onChangeText: (value: string) => void;
  onCancelEdit?: () => void;
  value: string;
  isEditing?: boolean;
  modelName?: string;
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  onChangeText,
  onCancelEdit,
  value,
  isEditing,
  modelName,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useSharedKeyboardVisibility();

  const sendScale = useSharedValue(1);
  const sendOpacity = useSharedValue(0);
  const hasText = value.trim().length > 0;

  useEffect(() => {
    sendOpacity.value = withTiming(hasText ? 1 : 0.3, { duration: 150 });
    if (hasText) {
      sendScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [hasText, sendOpacity, sendScale]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
<<<<<<< HEAD
    onSend(trimmed);
  };

  return (
    <View className="border-t border-white/5 bg-slate-950 px-4 pb-6 pt-3">
=======
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // noop
    }
    sendScale.value = withSpring(0.85, { damping: 8 }, () => {
      sendScale.value = withSpring(1, { damping: 12 });
    });
    onSend(trimmed);
  }, [isStreaming, onSend, sendScale, value]);

  const handleStop = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // noop
    }
    onStop();
  }, [onStop]);

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
    opacity: sendOpacity.value,
  }));

  const bottomPad = keyboardVisible ? 4 : Math.max(insets.bottom, 8);
  const charCount = value.length;
  const showCharCount = charCount > 200;

  const inputContent = (
    <View style={[styles.contentWrap, { paddingBottom: bottomPad }]}>
      {modelName && !keyboardVisible ? (
        <View style={styles.modelRow}>
          <View style={styles.modelDot} />
          <Text style={styles.modelText}>{modelName}</Text>
        </View>
      ) : null}

>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
      {isEditing ? (
        <View style={styles.editBanner}>
          <View style={styles.editBannerLeft}>
            <Ionicons name="create-outline" size={16} color="#fcd34d" />
            <Text style={styles.editBannerText}>Editing previous prompt</Text>
          </View>
          <Pressable onPress={onCancelEdit}>
            <Text style={styles.editBannerAction}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

<<<<<<< HEAD
      <View className="flex-row items-end gap-2 rounded-3xl border border-white/10 bg-slate-800/60 px-3 py-2 shadow-sm shadow-black/20">
        <Pressable className="h-[44px] w-[44px] items-center justify-center rounded-full bg-white/5 disabled:opacity-50">
          <Ionicons name="add" size={24} color="#94a3b8" />
        </Pressable>
=======
      <View style={styles.inputRow}>
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Message Atlas AI..."
          placeholderTextColor="#64748b"
          editable={!isStreaming}
          multiline
          maxLength={4000}
<<<<<<< HEAD
          className="mb-0.5 max-h-[140px] min-h-[44px] flex-1 px-2 py-3 text-sm text-white"
          style={{ textAlignVertical: 'top' }}
        />

        {isStreaming ? (
          <Pressable
            onPress={onStop}
            className="h-[44px] w-[44px] items-center justify-center rounded-full bg-red-600 active:bg-red-700">
            <View className="h-4 w-4 rounded-sm bg-white" />
=======
          style={styles.textInput}
          keyboardAppearance="dark"
          returnKeyType="default"
        />

        {isStreaming ? (
          <Pressable onPress={handleStop} style={styles.stopBtn}>
            <View style={styles.stopIcon} />
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
<<<<<<< HEAD
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
=======
            disabled={!hasText}
            style={[styles.sendBtn, hasText && styles.sendActive, sendAnimStyle]}>
            <Text style={[styles.sendArrow, hasText && styles.sendArrowActive]}>↑</Text>
          </AnimatedPressable>
        )}
      </View>

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
        <View style={styles.glassOverlay}>{inputContent}</View>
      </BlurView>
    );
  }

  return <View style={[styles.container, styles.fallback]}>{inputContent}</View>;
}

function useSharedKeyboardVisibility(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
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
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(252,211,77,0.25)',
    backgroundColor: 'rgba(252,211,77,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  editBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fde68a',
  },
  editBannerAction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fde68a',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 22,
    textAlignVertical: 'top',
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
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551

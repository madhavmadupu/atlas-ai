import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
} from 'react-native-reanimated';

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 }),
        ),
        -1,
      ),
    );
  }, [delay, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator() {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.avatarAI}>
        <Text style={styles.avatarAIText}>AI</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.dotsRow}>
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
        <Text style={styles.label}>Thinking...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  avatarAI: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  avatarAIText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(129,140,248,0.9)',
    letterSpacing: 0.5,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(129,140,248,0.6)',
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
  },
});

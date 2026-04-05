<<<<<<< HEAD
import { View } from 'react-native';
=======
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
<<<<<<< HEAD
  withDelay,
=======
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
} from 'react-native-reanimated';

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
<<<<<<< HEAD
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1
      )
    );
  }, [delay, opacity]);
=======
    translateY.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-4, { duration: 300 }), withTiming(0, { duration: 300 })), -1)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 300 }), withTiming(0.4, { duration: 300 })),
        -1
      )
    );
  }, [delay, opacity, translateY]);
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={style} className="h-2 w-2 rounded-full bg-white/40" />;
}

export function TypingIndicator() {
  return (
    <View className="mb-3 flex-row justify-start">
      <View className="rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3">
        <View className="flex-row gap-1.5">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
      </View>
    </View>
  );
}

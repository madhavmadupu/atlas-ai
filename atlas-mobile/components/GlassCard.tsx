import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
  className?: string;
}

export function GlassCard({ children, style, intensity = 40, className }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.wrapper, style]}>
        <BlurView intensity={intensity} tint="dark" style={styles.blur}>
          <View style={styles.overlay} className={className}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.fallback, style]} className={className}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  blur: {
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  fallback: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});

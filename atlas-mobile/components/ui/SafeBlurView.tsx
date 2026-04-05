import { useMemo } from 'react';
import { NativeModules, type StyleProp, type ViewProps, type ViewStyle, View } from 'react-native';

type BlurTint = 'light' | 'dark' | 'default' | 'extraLight' | 'regular' | 'prominent' | 'systemUltraThinMaterial';

interface SafeBlurViewProps extends ViewProps {
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  fallbackColor?: string;
}

function isExpoBlurAvailable(): boolean {
  const metadata = NativeModules.NativeUnimoduleProxy?.viewManagersMetadata;
  return Boolean(metadata?.ExpoBlurView);
}

export function SafeBlurView({
  children,
  fallbackColor = 'rgba(255,255,255,0.03)',
  intensity = 50,
  tint = 'default',
  style,
  ...props
}: SafeBlurViewProps) {
  const BlurComponent = useMemo(() => {
    if (!isExpoBlurAvailable()) {
      return null;
    }

    try {
      return require('expo-blur').BlurView as React.ComponentType<{
        children?: React.ReactNode;
        intensity?: number;
        tint?: BlurTint;
        style?: StyleProp<ViewStyle>;
      }>;
    } catch {
      return null;
    }
  }, []);

  if (!BlurComponent) {
    return (
      <View {...props} style={[{ backgroundColor: fallbackColor }, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurComponent {...props} intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurComponent>
  );
}

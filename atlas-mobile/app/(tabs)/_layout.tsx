import { Platform } from 'react-native';
import { NativeTabs, NativeTabTrigger } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor="#818cf8"
      iconColor={{
        default: 'rgba(255,255,255,0.35)',
        selected: '#818cf8',
      }}
      labelStyle={{
        default: { color: 'rgba(255,255,255,0.35)' },
        selected: { color: '#818cf8' },
      }}
      blurEffect={Platform.OS === 'ios' ? 'systemChromeMaterialDark' : undefined}
      minimizeBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
    >
      <NativeTabTrigger
        name="index"
        options={{
          title: 'Chats',
          icon: Platform.OS === 'ios'
            ? { sfSymbol: 'bubble.left.and.bubble.right.fill' }
            : require('@/assets/icon.png'),
        }}
      />
      <NativeTabTrigger
        name="models"
        options={{
          title: 'Models',
          icon: Platform.OS === 'ios'
            ? { sfSymbol: 'cube.fill' }
            : require('@/assets/icon.png'),
        }}
      />
      <NativeTabTrigger
        name="settings"
        options={{
          title: 'Settings',
          icon: Platform.OS === 'ios'
            ? { sfSymbol: 'gearshape.fill' }
            : require('@/assets/icon.png'),
        }}
      />
    </NativeTabs>
  );
}

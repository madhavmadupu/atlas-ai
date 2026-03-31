import { Platform } from 'react-native';
import { NativeTabs, NativeTabTrigger } from 'expo-router/unstable-native-tabs';
import type { SymbolOrImageSource } from 'expo-router/unstable-native-tabs';

function tabIcon(sfSymbol: string, androidImage: any): SymbolOrImageSource {
  if (Platform.OS === 'ios') {
    return { sf: sfSymbol as any };
  }
  return { src: androidImage };
}

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
          icon: tabIcon('bubble.left.and.bubble.right.fill', require('@/assets/tabs/chats.png')),
        }}
      />
      <NativeTabTrigger
        name="models"
        options={{
          title: 'Models',
          icon: tabIcon('cube.fill', require('@/assets/tabs/models.png')),
        }}
      />
      <NativeTabTrigger
        name="settings"
        options={{
          title: 'Settings',
          icon: tabIcon('gearshape.fill', require('@/assets/tabs/settings.png')),
        }}
      />
    </NativeTabs>
  );
}

import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';

interface Tab {
  name: string;
  label: string;
  icon: string;
  route: string;
}

const TABS: Tab[] = [
  { name: 'chats', label: 'Chats', icon: '💬', route: '/chat' },
  { name: 'models', label: 'Models', icon: '🧠', route: '/models' },
  { name: 'settings', label: 'Settings', icon: '⚙️', route: '/settings' },
];

export function FloatingTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const getActive = () => {
    if (pathname.startsWith('/chat')) return 'chats';
    if (pathname.startsWith('/models')) return 'models';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'chats';
  };

  const active = getActive();

  const TabContent = (
    <View style={styles.inner}>
      {TABS.map((tab) => {
        const isActive = active === tab.name;
        return (
          <Pressable
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={styles.glass}>
          <View style={styles.glassOverlay}>{TabContent}</View>
        </BlurView>
      ) : (
        <View style={styles.fallback}>{TabContent}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glass: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassOverlay: {
    backgroundColor: 'rgba(30,30,30,0.3)',
  },
  fallback: {
    borderRadius: 22,
    backgroundColor: 'rgba(22,22,22,0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelActive: {
    color: 'rgba(129,140,248,1)',
  },
  labelInactive: {
    color: 'rgba(255,255,255,0.4)',
  },
});

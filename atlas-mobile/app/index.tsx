import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useConnectionStore } from '@/store/connection.store';

export default function Index() {
  const router = useRouter();
  const { desktopIP, connectToDesktop, desktopPort } = useConnectionStore();

  useEffect(() => {
    const init = async () => {
      // Always try to connect with the default/saved IP on launch
      if (desktopIP) {
        const ok = await connectToDesktop(desktopIP, desktopPort);
        if (ok) {
          router.replace('/(tabs)');
          return;
        }
      }
      router.replace('/connect');
    };
    init();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#0a0a0a]">
      <ActivityIndicator size="large" color="#6366f1" />
      <Text className="mt-4 text-sm text-white/40">Connecting to desktop...</Text>
    </View>
  );
}

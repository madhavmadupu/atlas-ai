import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';

export default function Index() {
  const { connectToDesktop, desktopIP, desktopPort, inferenceProvider } = useConnectionStore();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (inferenceProvider === 'local') {
        if (!cancelled) setDestination('/chat');
        return;
      }

      if (!desktopIP) {
        if (!cancelled) setDestination('/connect');
        return;
      }

      const ok = await connectToDesktop(desktopIP, desktopPort);
      if (cancelled) return;
      setDestination(ok ? '/chat' : '/connect');
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [connectToDesktop, desktopIP, desktopPort, inferenceProvider]);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-[#0a0a0a]">
      <ActivityIndicator size="large" color="#6366f1" />
      <Text className="mt-4 text-sm text-white/40">
        {inferenceProvider === 'local' ? 'Opening offline chat…' : 'Connecting to desktop…'}
      </Text>
    </View>
  );
}

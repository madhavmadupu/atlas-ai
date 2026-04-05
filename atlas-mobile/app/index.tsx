import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';

export default function Index() {
<<<<<<< HEAD
  return <Redirect href="/chat" />;
=======
  const router = useRouter();
  const { connectToDesktop, desktopIP, desktopPort, inferenceProvider } = useConnectionStore();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (inferenceProvider === 'local') {
        if (!cancelled) router.replace('/chat');
        return;
      }

      if (!desktopIP) {
        if (!cancelled) router.replace('/connect');
        return;
      }

      const ok = await connectToDesktop(desktopIP, desktopPort);
      if (cancelled) return;
      router.replace(ok ? '/chat' : '/connect');
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [connectToDesktop, desktopIP, desktopPort, inferenceProvider, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#0a0a0a]">
      <ActivityIndicator size="large" color="#6366f1" />
      <Text className="mt-4 text-sm text-white/40">
        {inferenceProvider === 'local' ? 'Opening offline chat…' : 'Connecting to desktop…'}
      </Text>
    </View>
  );
>>>>>>> e254bd679dc5ef5196bc1c9db79d4973e6787551
}

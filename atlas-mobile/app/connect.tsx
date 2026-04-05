import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeBlurView } from '@/components/ui/SafeBlurView';
import { useConnectionStore } from '@/store/connection.store';

function GlassContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <View className="overflow-hidden rounded-3xl border border-white/10">
        <SafeBlurView intensity={30} tint="dark">
          <View className="bg-white/[0.03] p-6">{children}</View>
        </SafeBlurView>
      </View>
    );
  }

  return <View className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">{children}</View>;
}

export default function ConnectScreen() {
  const router = useRouter();
  const { connectToDesktop, desktopIP, desktopPort } = useConnectionStore();

  const [ip, setIp] = useState(desktopIP ?? '');
  const [port, setPort] = useState(String(desktopPort));
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const trimmedIp = ip.trim();
    const parsedPort = parseInt(port, 10) || 3001;

    if (!trimmedIp) {
      setError('Please enter an IP address');
      return;
    }

    setIsConnecting(true);
    setError(null);

    const success = await connectToDesktop(trimmedIp, parsedPort);

    if (success) {
      router.replace('/chat');
    } else {
      setError(
        'Could not connect. Make sure Atlas AI Desktop is running and both devices are on the same Wi-Fi network.'
      );
    }

    setIsConnecting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0a]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-10 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/20">
            <Text className="text-4xl">🧠</Text>
          </View>
          <Text className="mb-2 text-2xl font-bold text-white">Connect to Desktop</Text>
          <Text className="text-center text-sm leading-5 text-white/50">
            Enter the IP address shown in your Atlas AI Desktop app. Both devices must be on the
            same Wi-Fi network.
          </Text>
        </View>

        <GlassContainer>
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium uppercase tracking-[1.2px] text-white/35">
              Desktop IP Address
            </Text>
            <TextInput
              value={ip}
              onChangeText={(value) => {
                setIp(value);
                setError(null);
              }}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnecting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white"
            />
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium uppercase tracking-[1.2px] text-white/35">
              Port
            </Text>
            <TextInput
              value={port}
              onChangeText={(value) => {
                setPort(value);
                setError(null);
              }}
              placeholder="3001"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="number-pad"
              editable={!isConnecting}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white"
            />
          </View>

          {error ? (
            <View className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <Text className="text-sm leading-5 text-red-400">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleConnect}
            disabled={isConnecting}
            className={`items-center rounded-2xl py-4 ${
              isConnecting ? 'bg-indigo-600/50' : 'bg-indigo-600 active:bg-indigo-700'
            }`}>
            {isConnecting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-base font-semibold text-white">Connecting...</Text>
              </View>
            ) : (
              <Text className="text-base font-semibold text-white">Connect</Text>
            )}
          </Pressable>
        </GlassContainer>

        <Text className="mt-6 text-center text-xs leading-4 text-white/30">
          You can find the IP address in Atlas AI Desktop under Settings or in the title bar. The
          default port is 3001.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

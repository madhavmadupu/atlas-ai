import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';

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
      setError('Could not connect. Make sure Atlas AI Desktop is running and both devices are on the same Wi-Fi network.');
    }

    setIsConnecting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0a]"
    >
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="mb-10 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/20">
            <Text className="text-4xl">🧠</Text>
          </View>
          <Text className="mb-2 text-2xl font-bold text-white">Connect to Desktop</Text>
          <Text className="text-center text-sm leading-5 text-white/50">
            Enter the IP address shown in your Atlas AI Desktop app. Both devices must be on the same Wi-Fi network.
          </Text>
        </View>

        {/* IP Input */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-white/60">Desktop IP Address</Text>
          <TextInput
            value={ip}
            onChangeText={setIp}
            placeholder="e.g. 192.168.1.100"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="decimal-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnecting}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white"
          />
        </View>

        {/* Port Input */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-medium text-white/60">Port</Text>
          <TextInput
            value={port}
            onChangeText={setPort}
            placeholder="3001"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="number-pad"
            editable={!isConnecting}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white"
          />
        </View>

        {/* Error */}
        {error && (
          <View className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <Text className="text-sm leading-5 text-red-400">{error}</Text>
          </View>
        )}

        {/* Connect Button */}
        <Pressable
          onPress={handleConnect}
          disabled={isConnecting}
          className={`items-center rounded-xl py-4 ${
            isConnecting ? 'bg-indigo-600/50' : 'bg-indigo-600 active:bg-indigo-700'
          }`}
        >
          {isConnecting ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#ffffff" size="small" />
              <Text className="text-base font-semibold text-white">Connecting...</Text>
            </View>
          ) : (
            <Text className="text-base font-semibold text-white">Connect</Text>
          )}
        </Pressable>

        {/* Help text */}
        <Text className="mt-6 text-center text-xs leading-4 text-white/30">
          You can find the IP address in Atlas AI Desktop under Settings or in the title bar. The default port is 3001.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

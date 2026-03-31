import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';

function GlassContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <View style={glassStyles.wrapper}>
        <BlurView intensity={30} tint="dark" style={glassStyles.blur}>
          <View style={glassStyles.overlay}>{children}</View>
        </BlurView>
      </View>
    );
  }
  return <View style={glassStyles.fallback}>{children}</View>;
}

const glassStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  blur: { overflow: 'hidden' },
  overlay: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 24 },
  fallback: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
  },
});

export default function ConnectScreen() {
  const router = useRouter();
  const { connectToDesktop, desktopIP, desktopPort } = useConnectionStore();

  const [ip, setIp] = useState(desktopIP ?? '');
  const [port, setPort] = useState(String(desktopPort));
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const trimmedIp = ip.trim();
    if (!trimmedIp) {
      setError('Please enter an IP address');
      return;
    }
    setIsConnecting(true);
    setError(null);
    const success = await connectToDesktop(trimmedIp, parseInt(port, 10) || 3001);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError('Could not connect. Ensure Atlas AI Desktop is running and both devices share the same Wi-Fi.');
    }
    setIsConnecting(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0a]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-10 items-center">
          <View className="mb-5 h-24 w-24 items-center justify-center rounded-[28px] bg-indigo-500/10">
            <Text className="text-2xl font-black tracking-tighter text-indigo-400">Atlas</Text>
          </View>
          <Text className="mb-2 text-[26px] font-bold tracking-tight text-white">
            Connect to Desktop
          </Text>
          <Text className="max-w-[280px] text-center text-[14px] leading-5 text-white/35">
            Enter the IP from your Atlas AI Desktop app
          </Text>
        </View>

        {/* Form Card */}
        <GlassContainer>
          <View className="mb-5">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/30">
              IP Address
            </Text>
            <TextInput
              value={ip}
              onChangeText={(v) => { setIp(v); setError(null); }}
              placeholder="192.168.1.100"
              placeholderTextColor="rgba(255,255,255,0.15)"
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnecting}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-4 text-[17px] text-white"
            />
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/30">
              Port
            </Text>
            <TextInput
              value={port}
              onChangeText={(v) => { setPort(v); setError(null); }}
              placeholder="3001"
              placeholderTextColor="rgba(255,255,255,0.15)"
              keyboardType="number-pad"
              editable={!isConnecting}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-4 text-[17px] text-white"
            />
          </View>

          {error && (
            <View className="mb-5 flex-row items-start gap-2.5 rounded-2xl border border-red-500/10 bg-red-500/[0.07] px-4 py-3">
              <Text className="text-[13px] text-red-400">!</Text>
              <Text className="flex-1 text-[13px] leading-5 text-red-400/90">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleConnect}
            disabled={isConnecting}
            className={`items-center rounded-2xl py-4 ${
              isConnecting ? 'bg-indigo-600/50' : 'bg-indigo-600 active:bg-indigo-500'
            }`}
          >
            {isConnecting ? (
              <View className="flex-row items-center gap-2.5">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-[16px] font-semibold text-white">Connecting...</Text>
              </View>
            ) : (
              <Text className="text-[16px] font-semibold text-white">Connect</Text>
            )}
          </Pressable>
        </GlassContainer>

        {/* Hint */}
        <View className="mt-8 items-center px-4">
          <Text className="text-center text-[12px] leading-5 text-white/20">
            Look for the LAN IP in the desktop app's server logs{'\n'}
            <Text className="font-mono text-white/30">http://192.168.x.x:3001</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

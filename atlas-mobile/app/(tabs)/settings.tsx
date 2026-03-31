import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';
import { useChatStore } from '@/store/chat.store';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

function GlassSection({ children }: { children: React.ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        style={gs.glass}
      >
        {children}
      </GlassView>
    );
  }
  return <View style={gs.fallback}>{children}</View>;
}

const gs = StyleSheet.create({
  glass: { borderRadius: 20, marginBottom: 20 },
  fallback: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
});

function Row({ label, value, onPress, destructive, last }: { label: string; value?: string; onPress?: () => void; destructive?: boolean; last?: boolean }) {
  const content = (
    <View style={[rowStyles.row, !last && rowStyles.border]}>
      <Text style={[rowStyles.label, destructive && rowStyles.destructive]}>{label}</Text>
      {value !== undefined && <Text style={rowStyles.value}>{value}</Text>}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => pressed ? { opacity: 0.6 } : {}}>{content}</Pressable>;
  }
  return content;
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  border: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  label: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  value: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
  destructive: { color: 'rgba(239,68,68,0.9)' },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { desktopIP, desktopPort, isConnected, defaultModel, connectToDesktop, disconnect } =
    useConnectionStore();
  const conversationCount = useChatStore((s) => s.conversations.length);

  const [ip, setIp] = useState(desktopIP ?? '');
  const [port, setPort] = useState(String(desktopPort));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const ok = await connectToDesktop(ip.trim(), parseInt(port, 10) || 3001);
    setTestResult(ok ? 'success' : 'fail');
    setIsTesting(false);
  };

  const handleSave = async () => {
    if (!ip.trim()) return Alert.alert('Error', 'Enter an IP address');
    const ok = await connectToDesktop(ip.trim(), parseInt(port, 10) || 3001);
    Alert.alert(ok ? 'Connected' : 'Failed', ok ? 'Successfully connected.' : 'Check IP and port.');
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Disconnect from desktop?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => { disconnect(); router.replace('/connect'); } },
    ]);
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 20 }}>
        {/* Connection Status */}
        <GlassSection>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-white/40">Connection</Text>
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1">
                <View className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <Text className={`text-[11px] font-semibold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isConnected ? 'Connected' : 'Offline'}
                </Text>
              </View>
            </View>
            {isConnected && (
              <View className="mt-3 flex-row gap-5">
                <View>
                  <Text className="text-[10px] uppercase tracking-wider text-white/15">Endpoint</Text>
                  <Text className="mt-0.5 text-[13px] font-mono text-white/45">{desktopIP}:{desktopPort}</Text>
                </View>
                {defaultModel && (
                  <View>
                    <Text className="text-[10px] uppercase tracking-wider text-white/15">Model</Text>
                    <Text className="mt-0.5 text-[13px] text-white/45">{defaultModel}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </GlassSection>

        {/* Endpoint */}
        <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-white/25">
          Endpoint
        </Text>
        <GlassSection>
          <View style={{ padding: 16 }}>
            <View className="mb-4">
              <Text className="mb-1.5 text-[12px] font-medium text-white/30">IP Address</Text>
              <TextInput
                value={ip}
                onChangeText={(v) => { setIp(v); setTestResult(null); }}
                placeholder="192.168.1.100"
                placeholderTextColor="rgba(255,255,255,0.12)"
                keyboardType="decimal-pad"
                autoCapitalize="none"
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-[16px] text-white"
              />
            </View>
            <View className="mb-5">
              <Text className="mb-1.5 text-[12px] font-medium text-white/30">Port</Text>
              <TextInput
                value={port}
                onChangeText={(v) => { setPort(v); setTestResult(null); }}
                placeholder="3001"
                placeholderTextColor="rgba(255,255,255,0.12)"
                keyboardType="number-pad"
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-[16px] text-white"
              />
            </View>

            {testResult && (
              <View className={`mb-4 flex-row items-center gap-2 rounded-2xl px-4 py-3 ${testResult === 'success' ? 'bg-emerald-500/[0.07]' : 'bg-red-500/[0.07]'}`}>
                <Text>{testResult === 'success' ? '✓' : '✕'}</Text>
                <Text className={`text-[13px] ${testResult === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult === 'success' ? 'Connection successful' : 'Could not connect'}
                </Text>
              </View>
            )}

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={handleTest}
                disabled={isTesting}
                className="flex-1 items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3.5 active:bg-white/[0.06]"
              >
                {isTesting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-[14px] font-medium text-white/50">Test</Text>}
              </Pressable>
              <Pressable onPress={handleSave} className="flex-1 items-center rounded-2xl bg-indigo-600 py-3.5 active:bg-indigo-500">
                <Text className="text-[14px] font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          </View>
        </GlassSection>

        {/* Data */}
        <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-white/25">Data</Text>
        <GlassSection>
          <Row label="Conversations" value={String(conversationCount)} />
          <Row label="Storage" value="On desktop" />
          <Row label="Disconnect" onPress={isConnected ? handleDisconnect : undefined} destructive last />
        </GlassSection>

        {/* About */}
        <Text className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-white/25">About</Text>
        <GlassSection>
          <Row label="App" value="Atlas AI" />
          <Row label="Version" value="1.0.0" />
          <Row label="Privacy" value="100% local" />
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text className="text-[12px] leading-[18px] text-white/18">
              Atlas AI runs entirely on your local network. No data ever leaves your devices. Conversations are stored only on your desktop.
            </Text>
          </View>
        </GlassSection>
      </ScrollView>

    </View>
  );
}

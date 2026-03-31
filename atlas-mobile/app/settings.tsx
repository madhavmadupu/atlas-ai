import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';

export default function SettingsScreen() {
  const router = useRouter();
  const { desktopIP, desktopPort, isConnected, defaultModel, connectToDesktop, disconnect } =
    useConnectionStore();

  const [ip, setIp] = useState(desktopIP ?? '');
  const [port, setPort] = useState(String(desktopPort));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const success = await connectToDesktop(ip.trim(), parseInt(port, 10) || 3001);
    setTestResult(success ? 'success' : 'fail');
    setIsTesting(false);
  };

  const handleSave = async () => {
    const trimmedIp = ip.trim();
    if (!trimmedIp) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    const success = await connectToDesktop(trimmedIp, parseInt(port, 10) || 3001);
    if (success) {
      Alert.alert('Connected', 'Successfully connected to Atlas AI Desktop.');
    } else {
      Alert.alert('Connection Failed', 'Could not connect to the desktop. Check the IP and port.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Disconnect from the desktop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          disconnect();
          router.replace('/connect');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-[#0a0a0a]" contentContainerStyle={{ padding: 24 }}>
      {/* Connection Status */}
      <View className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-white/60">Connection Status</Text>
          <View className="flex-row items-center gap-2">
            <View
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
            <Text className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
        {defaultModel && (
          <Text className="mt-2 text-xs text-white/30">Active model: {defaultModel}</Text>
        )}
      </View>

      {/* API Endpoint */}
      <Text className="mb-3 text-base font-semibold text-white">API Endpoint</Text>
      <Text className="mb-4 text-sm leading-5 text-white/40">
        Configure the desktop IP address and port. The desktop shows its LAN IP in the server logs
        when it starts.
      </Text>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-white/60">IP Address</Text>
        <TextInput
          value={ip}
          onChangeText={(v) => {
            setIp(v);
            setTestResult(null);
          }}
          placeholder="e.g. 192.168.1.100"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white"
        />
      </View>

      <View className="mb-6">
        <Text className="mb-2 text-sm font-medium text-white/60">Port</Text>
        <TextInput
          value={port}
          onChangeText={(v) => {
            setPort(v);
            setTestResult(null);
          }}
          placeholder="3001"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="number-pad"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white"
        />
      </View>

      {/* Test Result */}
      {testResult && (
        <View
          className={`mb-4 rounded-xl border px-4 py-3 ${
            testResult === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : 'border-red-500/20 bg-red-500/10'
          }`}
        >
          <Text
            className={`text-sm ${testResult === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {testResult === 'success'
              ? 'Connection successful!'
              : 'Connection failed. Check IP and port.'}
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View className="mb-4 flex-row gap-3">
        <Pressable
          onPress={handleTestConnection}
          disabled={isTesting}
          className="flex-1 items-center rounded-xl border border-white/10 bg-white/5 py-3 active:bg-white/10"
        >
          {isTesting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-sm font-medium text-white/70">Test Connection</Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleSave}
          className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
        >
          <Text className="text-sm font-semibold text-white">Save & Connect</Text>
        </Pressable>
      </View>

      {/* Disconnect */}
      {isConnected && (
        <Pressable
          onPress={handleDisconnect}
          className="mt-2 items-center rounded-xl border border-red-500/20 py-3 active:bg-red-500/10"
        >
          <Text className="text-sm font-medium text-red-400">Disconnect</Text>
        </Pressable>
      )}

      {/* About */}
      <View className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
        <Text className="text-sm font-medium text-white/80">Atlas AI Mobile</Text>
        <Text className="mt-1 text-xs text-white/40">Version 1.0.0</Text>
        <Text className="mt-3 text-xs leading-4 text-white/30">
          Connects to Atlas AI Desktop over your local Wi-Fi network. No internet required. Your
          conversations never leave your network.
        </Text>
      </View>
    </ScrollView>
  );
}

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
  const {
    desktopIP,
    desktopPort,
    isConnected,
    defaultModel,
    inferenceProvider,
    localModelPath,
    huggingFaceToken,
    connectToDesktop,
    disconnect,
    setInferenceProvider,
    setLocalModel,
    setHuggingFaceToken,
  } = useConnectionStore();

  const [ip, setIp] = useState(desktopIP ?? '');
  const [port, setPort] = useState(String(desktopPort));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [localPath, setLocalPath] = useState(localModelPath ?? '');
  const [hfTokenInput, setHfTokenInput] = useState(huggingFaceToken ?? '');

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const success = await connectToDesktop(ip.trim(), parseInt(port, 10) || 3001);
    setTestResult(success ? 'success' : 'fail');
    setIsTesting(false);
  };

  const handleSave = async () => {
    if (inferenceProvider === 'local') {
      const trimmed = localPath.trim();
      if (!trimmed.startsWith('file://')) {
        Alert.alert('Error', 'Local model path must be a file URI starting with file://');
        return;
      }
      setLocalModel({ path: trimmed, name: null });
      Alert.alert('Saved', 'Local model path saved.');
      return;
    }

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

  const handleSaveToken = () => {
    setHuggingFaceToken(hfTokenInput.trim() || null);
    Alert.alert('Saved', 'Hugging Face token stored for gated downloads.');
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

      {/* Inference Provider */}
      <Text className="mb-3 text-base font-semibold text-white">Inference</Text>
      <Text className="mb-4 text-sm leading-5 text-white/40">
        Choose whether to run the model on your desktop (Ollama over Wi-Fi) or directly on-device
        using llama.cpp via llama.rn (requires a custom dev client / native build).
      </Text>

      <View className="mb-6 flex-row gap-3">
        <Pressable
          onPress={() => setInferenceProvider('desktop')}
          className={`flex-1 items-center rounded-xl border py-3 ${
            inferenceProvider === 'desktop'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-white/10 bg-white/5'
          }`}>
          <Text className="text-sm font-semibold text-white">Desktop</Text>
          <Text className="mt-1 text-xs text-white/40">Ollama</Text>
        </Pressable>

        <Pressable
          onPress={() => setInferenceProvider('local')}
          className={`flex-1 items-center rounded-xl border py-3 ${
            inferenceProvider === 'local'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-white/10 bg-white/5'
          }`}>
          <Text className="text-sm font-semibold text-white">On-device</Text>
          <Text className="mt-1 text-xs text-white/40">llama.cpp</Text>
        </Pressable>
      </View>

      <View className="mb-6">
        <Text className="mb-2 text-sm font-medium text-white/60">Model management</Text>
        <Text className="mb-2 text-xs text-white/40">
          Download GGUF weights from Hugging Face or import files, then run them locally on-device.
        </Text>
        <Pressable
          onPress={() => router.push('/models')}
          className="items-center rounded-xl border border-white/10 bg-white/5 py-3">
          <Text className="text-sm font-semibold text-white">Manage on-device models</Text>
        </Pressable>
      </View>

      <View className="mb-6">
        <Text className="mb-2 text-sm font-medium text-white/60">Hugging Face Token</Text>
        <TextInput
          value={hfTokenInput}
          onChangeText={setHfTokenInput}
          placeholder="hf_xxx..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          autoCorrect={false}
          className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white"
        />
        <Pressable
          onPress={handleSaveToken}
          className="items-center rounded-xl border border-white/10 bg-emerald-500/20 py-3">
          <Text className="text-sm font-semibold text-white">Save token</Text>
        </Pressable>
        {huggingFaceToken && (
          <Text className="mt-2 text-xs text-white/40">Token configured for gated downloads.</Text>
        )}
        <Text className="mt-2 text-xs text-white/40">
          This token is only needed if the model requires gated access; keep it even when using the
          desktop provider.
        </Text>
      </View>

      {inferenceProvider === 'local' ? (
        <View className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <Text className="mb-2 text-sm font-medium text-white/70">Local GGUF Model Path</Text>
          <Text className="mb-3 text-xs leading-4 text-white/40">
            Provide a `file://` URI for the GGUF you picked on the Models screen (or import it from
            Files).
          </Text>
          <TextInput
            value={localPath}
            onChangeText={(v) => setLocalPath(v)}
            placeholder="file://.../model.gguf"
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white"
          />
          <Pressable
            onPress={handleSave}
            className="mt-4 items-center rounded-xl border border-emerald-400/50 bg-emerald-500/10 py-3">
            <Text className="text-sm font-semibold text-white">Save local model</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text className="mb-3 text-base font-semibold text-white">API Endpoint</Text>
          <Text className="mb-4 text-sm leading-5 text-white/40">
            Configure the desktop IP address and port. The desktop shows its LAN IP in the server
            logs when it starts.
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

          {testResult && (
            <View
              className={`mb-4 rounded-xl border px-4 py-3 ${
                testResult === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-red-500/20 bg-red-500/10'
              }`}>
              <Text
                className={`text-sm ${testResult === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult === 'success'
                  ? 'Connection successful!'
                  : 'Connection failed. Check IP and port.'}
              </Text>
            </View>
          )}

          <View className="mb-4 flex-row gap-3">
            <Pressable
              onPress={handleTestConnection}
              disabled={isTesting}
              className="flex-1 items-center rounded-xl border border-white/10 bg-white/5 py-3 active:bg-white/10">
              {isTesting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-sm font-medium text-white/70">Test Connection</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleSave}
              className="flex-1 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700">
              <Text className="text-sm font-semibold text-white">Save & Connect</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Disconnect */}
      {isConnected && (
        <Pressable
          onPress={handleDisconnect}
          className="mt-2 items-center rounded-xl border border-red-500/20 py-3 active:bg-red-500/10">
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

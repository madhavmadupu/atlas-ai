import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getTierLabel } from '@/lib/local-inference';
import type { DevicePerformanceTier } from '@/lib/types';
import { useConnectionStore } from '@/store/connection.store';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    connectToDesktop,
    defaultModel,
    desktopIP,
    desktopPort,
    disconnect,
    huggingFaceToken,
    inferenceProvider,
    isConnected,
    localModelName,
    localSettings,
    setHuggingFaceToken,
    setInferenceProvider,
    updateLocalSettings,
    applyLocalTier,
  } = useConnectionStore();

  const [ip, setIp] = useState(desktopIP ?? '');
  const [port, setPort] = useState(String(desktopPort));
  const [isTesting, setIsTesting] = useState(false);
  const [hfTokenInput, setHfTokenInput] = useState(huggingFaceToken ?? '');
  const [systemPrompt, setSystemPrompt] = useState(localSettings.systemPrompt);
  const [temperature, setTemperature] = useState(String(localSettings.temperature));
  const [topP, setTopP] = useState(String(localSettings.topP));
  const [maxTokens, setMaxTokens] = useState(String(localSettings.maxTokens));
  const [contextSize, setContextSize] = useState(String(localSettings.contextSize));
  const [gpuLayers, setGpuLayers] = useState(String(localSettings.gpuLayers));
  const [isEditingDesktop, setIsEditingDesktop] = useState(false);
  const [isEditingLocalSettings, setIsEditingLocalSettings] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);

  useEffect(() => {
    setSystemPrompt(localSettings.systemPrompt);
    setTemperature(String(localSettings.temperature));
    setTopP(String(localSettings.topP));
    setMaxTokens(String(localSettings.maxTokens));
    setContextSize(String(localSettings.contextSize));
    setGpuLayers(String(localSettings.gpuLayers));
  }, [localSettings]);

  useEffect(() => {
    setHfTokenInput(huggingFaceToken ?? '');
  }, [huggingFaceToken]);

  const saveDesktop = async () => {
    const trimmedIp = ip.trim();
    if (!trimmedIp) {
      Alert.alert('Missing IP', 'Enter the desktop IP address first.');
      return;
    }

    setIsTesting(true);
    try {
      const ok = await connectToDesktop(trimmedIp, parseInt(port, 10) || 3001);
      Alert.alert(
        ok ? 'Connected' : 'Connection failed',
        ok ? 'Desktop connection saved.' : 'Atlas AI Desktop was not reachable at that IP and port.'
      );
      if (ok) setIsEditingDesktop(false);
    } finally {
      setIsTesting(false);
    }
  };

  const saveLocalSettings = () => {
    const parsedTemperature = Number(temperature);
    const parsedTopP = Number(topP);
    const parsedMaxTokens = Number(maxTokens);
    const parsedContext = Number(contextSize);
    const parsedGpuLayers = Number(gpuLayers);

    if (
      Number.isNaN(parsedTemperature) ||
      Number.isNaN(parsedTopP) ||
      Number.isNaN(parsedMaxTokens) ||
      Number.isNaN(parsedContext) ||
      Number.isNaN(parsedGpuLayers)
    ) {
      Alert.alert('Invalid values', 'All local inference fields must be numeric.');
      return;
    }

    updateLocalSettings({
      systemPrompt: systemPrompt.trim(),
      temperature: parsedTemperature,
      topP: parsedTopP,
      maxTokens: parsedMaxTokens,
      contextSize: parsedContext,
      gpuLayers: parsedGpuLayers,
    });

    Alert.alert('Saved', 'Local inference settings updated.');
    setIsEditingLocalSettings(false);
  };

  const saveToken = () => {
    setHuggingFaceToken(hfTokenInput.trim() || null);
    Alert.alert('Saved', 'Hugging Face token updated.');
    setIsEditingToken(false);
  };

  const renderTierButton = (tier: DevicePerformanceTier) => {
    const active = tier === localSettings.performanceTier;
    return (
      <Pressable
        key={tier}
        onPress={() => applyLocalTier(tier)}
        className={`flex-1 rounded-2xl border px-3 py-3 ${
          active ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-white/10 bg-white/5'
        }`}>
        <Text className="text-center text-sm font-semibold text-white">{getTierLabel(tier)}</Text>
        <Text className="mt-1 text-center text-xs text-white/40">
          {tier === 'low' ? 'Battery first' : tier === 'medium' ? 'Balanced' : 'Quality first'}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
      <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">Inference provider</Text>
          <Text className="text-xs text-white/40">
            Active: {inferenceProvider === 'local' ? 'On-device' : 'Desktop'}
          </Text>
        </View>
        <Text className="mt-2 text-sm leading-5 text-white/40">
          Desktop mode keeps the existing LAN flow. On-device mode runs a local GGUF through
          `llama.rn` so chat still works offline.
        </Text>
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={() => setInferenceProvider('desktop')}
            className={`flex-1 rounded-2xl border py-3 ${
              inferenceProvider === 'desktop'
                ? 'border-blue-500/40 bg-blue-500/15'
                : 'border-white/10 bg-white/5'
            }`}>
            <Text className="text-center text-sm font-semibold text-white">Desktop</Text>
            <Text className="mt-1 text-center text-xs text-white/40">Ollama over Wi-Fi</Text>
          </Pressable>
          <Pressable
            onPress={() => setInferenceProvider('local')}
            className={`flex-1 rounded-2xl border py-3 ${
              inferenceProvider === 'local'
                ? 'border-emerald-500/40 bg-emerald-500/15'
                : 'border-white/10 bg-white/5'
            }`}>
            <Text className="text-center text-sm font-semibold text-white">On-device</Text>
            <Text className="mt-1 text-center text-xs text-white/40">Offline llama.cpp</Text>
          </Pressable>
        </View>
      </View>

      {inferenceProvider === 'desktop' ? (
        <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-semibold text-white">Desktop connection</Text>
              <Text
                className={`mt-1 text-xs ${isConnected ? 'text-emerald-300' : 'text-white/40'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            <Pressable
              onPress={() => setIsEditingDesktop((current) => !current)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-white">
                {isEditingDesktop ? 'Lock' : 'Edit'}
              </Text>
            </Pressable>
          </View>
          {defaultModel ? (
            <Text className="mt-1 text-xs text-white/40">Desktop default model: {defaultModel}</Text>
          ) : null}
          <TextInput
            value={ip}
            onChangeText={setIp}
            placeholder="192.168.1.100"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="decimal-pad"
            editable={isEditingDesktop}
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm text-white ${
              isEditingDesktop ? 'border-white/10 bg-black/20' : 'border-white/5 bg-white/[0.03]'
            }`}
          />
          <TextInput
            value={port}
            onChangeText={setPort}
            placeholder="3001"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="number-pad"
            editable={isEditingDesktop}
            className={`mt-3 rounded-2xl border px-4 py-3 text-sm text-white ${
              isEditingDesktop ? 'border-white/10 bg-black/20' : 'border-white/5 bg-white/[0.03]'
            }`}
          />
          <View className="mt-4 flex-row gap-3">
            {isEditingDesktop ? (
              <Pressable
                onPress={() => void saveDesktop()}
                className="flex-1 items-center rounded-2xl bg-blue-600 py-3">
                {isTesting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Test and save</Text>
                )}
              </Pressable>
            ) : (
              <View className="flex-1 justify-center rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <Text className="text-sm text-white/35">Tap edit to change IP or port.</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                disconnect();
                setIsEditingDesktop(false);
                Alert.alert('Disconnected', 'Desktop endpoint cleared.');
              }}
              className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
              <Text className="text-sm font-semibold text-white">Disconnect</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">On-device model</Text>
              <Pressable
                onPress={() => router.push('/models')}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-white">
                  Manage
                </Text>
              </Pressable>
            </View>
            <Text className="mt-2 text-sm text-white/40">
              Selected model: {localModelName ?? 'None yet'}
            </Text>
            <Text className="mt-1 text-xs text-white/40">
              Current profile: {getTierLabel(localSettings.performanceTier)}
            </Text>
            <View className="mt-4 flex-row gap-3">
              {(['low', 'medium', 'high'] as DevicePerformanceTier[]).map(renderTierButton)}
            </View>
            <Pressable
              onPress={() => router.push('/models')}
              className="mt-4 items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3">
              <Text className="text-sm font-semibold text-white">Open model manager</Text>
            </Pressable>
          </View>

          <View className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">Local inference settings</Text>
              <Pressable
                onPress={() => setIsEditingLocalSettings((current) => !current)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-white">
                  {isEditingLocalSettings ? 'Lock' : 'Edit'}
                </Text>
              </Pressable>
            </View>
            <Text className="mt-2 text-sm leading-5 text-white/40">
              These values are used when the app runs the model locally through `llama.rn`.
            </Text>

            <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-white/50">
              System prompt
            </Text>
            <TextInput
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              placeholder="You are Atlas AI..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              editable={isEditingLocalSettings}
              multiline
              className={`mt-2 min-h-[110px] rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingLocalSettings
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
              style={{ textAlignVertical: 'top' }}
            />

            <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-white/50">
              Temperature
            </Text>
            <TextInput
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="decimal-pad"
              editable={isEditingLocalSettings}
              className={`mt-2 rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingLocalSettings
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
            />

            <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-white/50">
              Top P
            </Text>
            <TextInput
              value={topP}
              onChangeText={setTopP}
              keyboardType="decimal-pad"
              editable={isEditingLocalSettings}
              className={`mt-2 rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingLocalSettings
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
            />

            <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-white/50">
              Max response tokens
            </Text>
            <TextInput
              value={maxTokens}
              onChangeText={setMaxTokens}
              keyboardType="number-pad"
              editable={isEditingLocalSettings}
              className={`mt-2 rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingLocalSettings
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
            />

            <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-white/50">
              Context size
            </Text>
            <TextInput
              value={contextSize}
              onChangeText={setContextSize}
              keyboardType="number-pad"
              editable={isEditingLocalSettings}
              className={`mt-2 rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingLocalSettings
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
            />

            <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-white/50">
              GPU layers
            </Text>
            <TextInput
              value={gpuLayers}
              onChangeText={setGpuLayers}
              keyboardType="number-pad"
              editable={isEditingLocalSettings}
              className={`mt-2 rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingLocalSettings
                  ? 'border-white/10 bg-black/20'
                  : 'border-white/5 bg-white/[0.03]'
              }`}
            />

            {isEditingLocalSettings ? (
              <Pressable
                onPress={saveLocalSettings}
                className="mt-5 items-center rounded-2xl bg-emerald-600 py-3">
                <Text className="text-sm font-semibold text-white">Save local settings</Text>
              </Pressable>
            ) : (
              <Text className="mt-5 text-sm text-white/35">
                Tap edit to adjust prompt, temperature, context, and GPU layers.
              </Text>
            )}
          </View>

          <View className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">Download access</Text>
              <Pressable
                onPress={() => setIsEditingToken((current) => !current)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-white">
                  {isEditingToken ? 'Lock' : 'Edit'}
                </Text>
              </Pressable>
            </View>
            <TextInput
              value={hfTokenInput}
              onChangeText={setHfTokenInput}
              placeholder="hf_xxx..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              editable={isEditingToken}
              className={`mt-3 rounded-2xl border px-4 py-3 text-sm text-white ${
                isEditingToken ? 'border-white/10 bg-black/20' : 'border-white/5 bg-white/[0.03]'
              }`}
            />
            {isEditingToken ? (
              <Pressable
                onPress={saveToken}
                className="mt-4 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
                <Text className="text-sm font-semibold text-white">Save Hugging Face token</Text>
              </Pressable>
            ) : (
              <Text className="mt-4 text-sm text-white/35">
                Tap edit to update download credentials.
              </Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

import { useEffect, useMemo, useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchModelFiles, pickBestGguf, searchHuggingFaceModels } from '@/lib/huggingface';
import { getTierLabel, TIER_RECOMMENDATIONS } from '@/lib/local-inference';
import { buildModelPath, ensureModelDirectory } from '@/lib/model-storage';
import { validateLocalChatModel } from '@/lib/model-validation';
import type { HuggingFaceModelSummary } from '@/lib/huggingface';
import type { DevicePerformanceTier } from '@/lib/types';
import { useConnectionStore } from '@/store/connection.store';
import { useModelStore } from '@/store/model.store';

export default function ModelsScreen() {
  const router = useRouter();
  const {
    models,
    loadModels,
    addModel,
    removeModel,
    downloadingModelId,
    downloadProgress,
    setDownloadProgress,
  } = useModelStore();
  const {
    huggingFaceToken,
    localModelPath,
    localModelName,
    localSettings,
    applyLocalTier,
    setHuggingFaceToken,
    setInferenceProvider,
    setLocalModel,
  } = useConnectionStore();

  const [hfTokenInput, setHfTokenInput] = useState(huggingFaceToken ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<HuggingFaceModelSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const activeTier = localSettings.performanceTier;
  const recommendations = useMemo(() => TIER_RECOMMENDATIONS, []);

  const handleSaveToken = () => {
    setHuggingFaceToken(hfTokenInput.trim() || null);
    Alert.alert('Saved', 'Hugging Face token stored for model downloads.');
  };

  const downloadModel = async (
    modelId: string,
    progressId: string,
    preferredQuantization?: string
  ) => {
    try {
      setDownloadProgress(progressId, 0);
      const files = await fetchModelFiles(modelId, huggingFaceToken?.trim() || undefined);
      const candidate = pickBestGguf(files, activeTier, preferredQuantization);

      if (!candidate) {
        Alert.alert('No GGUF found', 'That repository does not expose a GGUF file we can use.');
        return;
      }

      const validation = validateLocalChatModel([candidate.rfilename, modelId]);
      if (!validation.isChatCapable) {
        Alert.alert('Unsupported model', validation.reason);
        return;
      }

      await ensureModelDirectory();
      const destination = buildModelPath(modelId, candidate.rfilename);
      const downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${candidate.rfilename}`;
      const token = huggingFaceToken?.trim();

      const download = FileSystem.createDownloadResumable(
        downloadUrl,
        destination,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {},
        (progress) => {
          const ratio =
            progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : null;
          setDownloadProgress(progressId, ratio);
        }
      );

      const result = await download.downloadAsync();
      if (!result?.uri) {
        throw new Error('Download finished without a local file path.');
      }

      await addModel({
        id: `${modelId}-${candidate.rfilename}`,
        name: candidate.rfilename,
        path: result.uri,
        size: candidate.size ?? 0,
        source: 'huggingface',
        huggingFaceId: modelId,
        createdAt: new Date().toISOString(),
      });

      setLocalModel({ path: result.uri, name: candidate.rfilename });
      setInferenceProvider('local');

      Alert.alert(
        'Model ready',
        `${candidate.rfilename} is stored on-device and selected for offline chat.`
      );
    } catch (error) {
      Alert.alert(
        'Download failed',
        error instanceof Error ? error.message : 'Unable to download this model.'
      );
    } finally {
      setDownloadProgress(null, null);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchHuggingFaceModels(
        searchTerm.trim(),
        huggingFaceToken?.trim() || undefined
      );
      setSearchResults(results);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const dir = await ensureModelDirectory();
      const fileName = asset.name || `model-${Date.now()}.gguf`;
      const destination = `${dir}${fileName}`;

      await FileSystem.copyAsync({
        from: asset.uri,
        to: destination,
      });

      const info = await FileSystem.getInfoAsync(destination);
      if (!info.exists) {
        throw new Error('The selected file could not be copied into app storage.');
      }

      const validation = validateLocalChatModel([fileName, destination]);
      if (!validation.isChatCapable) {
        await FileSystem.deleteAsync(destination, { idempotent: true });
        Alert.alert('Unsupported model', validation.reason);
        return;
      }

      await addModel({
        id: `manual-${Date.now()}`,
        name: fileName,
        path: destination,
        size: info.size ?? 0,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });

      setLocalModel({ path: destination, name: fileName });
      setInferenceProvider('local');
      Alert.alert('Imported', `${fileName} is now available for offline chat.`);
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof Error ? error.message : 'Unable to import that GGUF file.'
      );
    }
  };

  const handleUseModel = (path: string, name: string) => {
    const validation = validateLocalChatModel([name, path]);
    if (!validation.isChatCapable) {
      Alert.alert('Unsupported model', validation.reason);
      return;
    }
    setLocalModel({ path, name });
    setInferenceProvider('local');
    Alert.alert('Selected', `${name} will be used for on-device inference.`);
  };

  const handleDelete = async (id: string, name: string) => {
    await removeModel(id);
    if (models.find((model) => model.id === id)?.path === localModelPath) {
      setLocalModel(null);
    }
    Alert.alert('Removed', `${name} was deleted from this device.`);
  };

  const renderTierButton = (tier: DevicePerformanceTier) => {
    const active = tier === activeTier;
    return (
      <Pressable
        key={tier}
        onPress={() => applyLocalTier(tier)}
        className={`flex-1 rounded-2xl border px-3 py-3 ${
          active ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-white/10 bg-white/5'
        }`}>
        <Text className="text-center text-sm font-semibold text-white">{getTierLabel(tier)}</Text>
        <Text className="mt-1 text-center text-xs text-white/40">
          {tier === 'low' ? '1B to 2B' : tier === 'medium' ? '3B class' : '7B class'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-semibold text-white">On-device Models</Text>
            <Text className="mt-1 text-sm text-white/40">
              Offline chat runs through `llama.rn` and a local GGUF on the phone.
            </Text>
          </View>
          <Pressable onPress={() => router.back()} className="rounded-xl bg-white/5 px-3 py-2">
            <Text className="text-sm font-semibold text-white/80">Close</Text>
          </Pressable>
        </View>

        <View className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <Text className="text-sm font-medium text-white/60">Device profile</Text>
          <Text className="mt-1 text-sm leading-5 text-white/40">
            Pick the class of phone you want to target. Atlas uses this to choose saner default
            quantizations and llama.cpp settings.
          </Text>
          <View className="mt-4 flex-row gap-3">
            {(['low', 'medium', 'high'] as DevicePerformanceTier[]).map(renderTierButton)}
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <Text className="text-sm font-medium text-white/60">Active offline model</Text>
          <Text className="mt-2 text-base font-semibold text-white">
            {localModelName ?? 'No model selected'}
          </Text>
          <Text className="mt-1 text-xs text-white/40">
            Tier: {getTierLabel(activeTier)}. Context {localSettings.contextSize}. Max response{' '}
            {localSettings.maxTokens} tokens.
          </Text>
        </View>

        <View className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-white/60">Hugging Face token</Text>
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
          <View className="mt-3 flex-row gap-3">
            {isEditingToken ? (
              <Pressable
                onPress={() => {
                  handleSaveToken();
                  setIsEditingToken(false);
                }}
                className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
                <Text className="text-sm font-semibold text-white">Save token</Text>
              </Pressable>
            ) : (
              <View className="flex-1 justify-center rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <Text className="text-sm text-white/35">Tap edit to change the token.</Text>
              </View>
            )}
            <Pressable
              onPress={() => setShowSearch(true)}
              className="flex-1 items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3">
              <Text className="text-sm font-semibold text-white">Search Hugging Face</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-6 flex-row gap-3">
          <Pressable
            onPress={handleImport}
            className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
            <Text className="text-sm font-semibold text-white">Import GGUF</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
            <Text className="text-sm font-semibold text-white">Tune settings</Text>
          </Pressable>
        </View>

        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold text-white">Recommended downloads</Text>
          {recommendations.map((item) => {
            const downloading = downloadingModelId === item.id;
            const highlighted = item.tier === activeTier;

            return (
              <View
                key={item.id}
                className={`mb-3 rounded-3xl border p-4 ${
                  highlighted
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
                }`}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-white">{item.title}</Text>
                    <Text className="mt-1 text-xs text-white/50">{item.repoId}</Text>
                  </View>
                  <Text className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/70">
                    {item.target}
                  </Text>
                </View>
                <Text className="mt-3 text-sm leading-5 text-white/40">{item.description}</Text>
                <Text className="mt-2 text-xs text-white/50">
                  Suggested quantization: {item.suggestedQuantization}. Storage:{' '}
                  {item.estimatedSize}
                </Text>
                <Pressable
                  disabled={downloading}
                  onPress={() =>
                    void downloadModel(item.repoId, item.id, item.suggestedQuantization)
                  }
                  className={`mt-4 items-center rounded-2xl py-3 ${
                    downloading ? 'bg-white/20' : 'bg-emerald-600'
                  }`}>
                  {downloading ? (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text className="text-sm font-semibold text-white">
                        {downloadProgress ? `${Math.round(downloadProgress * 100)}%` : 'Preparing'}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-sm font-semibold text-white">Download for this tier</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View>
          <Text className="mb-3 text-sm font-semibold text-white">Stored locally</Text>
          {models.length === 0 ? (
            <View className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-4">
              <Text className="text-sm text-white/40">
                No GGUF files are stored on this device yet.
              </Text>
            </View>
          ) : (
            models.map((model) => {
              const active = model.path === localModelPath;

              return (
                <View
                  key={model.id}
                  className="mb-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-3 text-base font-semibold text-white">
                      {model.name}
                    </Text>
                    {active && (
                      <Text className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Active
                      </Text>
                    )}
                  </View>
                  <Text className="mt-1 text-xs text-white/40">
                    {model.source === 'huggingface'
                      ? model.huggingFaceId
                      : 'Imported from local files'}
                  </Text>
                  <View className="mt-4 flex-row gap-3">
                    <Pressable
                      onPress={() => handleUseModel(model.path, model.name)}
                      className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
                      <Text className="text-sm font-semibold text-white">Use model</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleDelete(model.id, model.name)}
                      className="flex-1 items-center rounded-2xl border border-red-500/20 bg-red-500/10 py-3">
                      <Text className="text-sm font-semibold text-red-200">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {showSearch && (
        <View className="absolute inset-0 bg-black/75">
          <View className="mx-4 mt-16 flex-1 rounded-[28px] bg-[#111111] p-4">
            <View className="mb-3 flex-row gap-2">
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search GGUF models"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white"
              />
              <Pressable
                onPress={() => void handleSearch()}
                className="rounded-2xl bg-emerald-600 px-4 py-3">
                {isSearching ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Search</Text>
                )}
              </Pressable>
            </View>

            {searchError && <Text className="mb-2 text-sm text-red-300">{searchError}</Text>}

            <ScrollView className="flex-1">
              {searchResults.length === 0 && !isSearching ? (
                <Text className="text-sm text-white/40">
                  Search for a Hugging Face repository. Atlas will pick a GGUF that matches the
                  selected device profile when possible.
                </Text>
              ) : (
                searchResults.map((item) => {
                  const downloading = downloadingModelId === item.id;
                  return (
                    <View
                      key={item.id}
                      className="mb-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                      <Text className="text-base font-semibold text-white">{item.modelId}</Text>
                      <Text className="mt-1 text-xs text-white/40">
                        Downloads: {item.downloads.toLocaleString()}
                      </Text>
                      <Pressable
                        disabled={downloading}
                        onPress={() => void downloadModel(item.modelId, item.id)}
                        className={`mt-4 items-center rounded-2xl py-3 ${
                          downloading ? 'bg-white/20' : 'bg-emerald-600'
                        }`}>
                        {downloading ? (
                          <View className="flex-row items-center gap-2">
                            <ActivityIndicator color="#ffffff" size="small" />
                            <Text className="text-sm font-semibold text-white">
                              {downloadProgress
                                ? `${Math.round(downloadProgress * 100)}%`
                                : 'Preparing'}
                            </Text>
                          </View>
                        ) : (
                          <Text className="text-sm font-semibold text-white">Download GGUF</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              onPress={() => {
                setShowSearch(false);
                setSearchError(null);
              }}
              className="mt-3 items-center rounded-2xl border border-white/10 bg-white/10 py-3">
              <Text className="text-sm font-semibold text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useConnectionStore } from '@/store/connection.store';
import { useModelStore } from '@/store/model.store';
import { fetchModelFiles, pickBestGguf, searchHuggingFaceModels } from '@/lib/huggingface';
import { buildModelPath, ensureModelDirectory } from '@/lib/model-storage';
import type { LocalModel } from '@/store/model.store';
import type { HuggingFaceModelSummary } from '@/lib/huggingface';

const CATALOG_MODELS = [
  {
    modelId: 'TheBloke/guanaco-7B-HF',
    title: 'Guanaco 7B (HF)',
    size: '2.7 GB',
    params: '7B',
    skills: 'Question answering, reasoning, summarization',
  },
  {
    modelId: 'TheBloke/stable-vicuna-13b',
    title: 'Stable Vicuna 13B',
    size: '4.2 GB',
    params: '13B',
    skills: 'Dialogue, code generation',
  },
  {
    modelId: 'TheBloke/llama3-7b',
    title: 'Llama 3 7B',
    size: '3.5 GB',
    params: '7B',
    skills: 'Math, reasoning, coding',
  },
];

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
    localModelPath,
    setLocalModel,
    setInferenceProvider,
    inferenceProvider,
    huggingFaceToken,
    setHuggingFaceToken,
  } = useConnectionStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<HuggingFaceModelSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showHfSearch, setShowHfSearch] = useState(false);
  const [hfTokenInput, setHfTokenInput] = useState(huggingFaceToken ?? '');

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const canUseLocal = useMemo(() => inferenceProvider === 'local', [inferenceProvider]);

  const handleSaveToken = () => {
    setHuggingFaceToken(hfTokenInput.trim() || null);
    Alert.alert('Saved', 'Hugging Face token stored for gated downloads.');
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
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCatalogDownload = (model: (typeof CATALOG_MODELS)[number]) => {
    handleDownload({
      id: model.modelId,
      modelId: model.modelId,
      downloads: 0,
      tags: [],
      lastModified: new Date().toISOString(),
    });
  };

  const handleDownload = async (model: HuggingFaceModelSummary) => {
    try {
      setShowAddMenu(false);
      setShowHfSearch(false);
      setDownloadProgress(model.id, 0);
      const files = await fetchModelFiles(model.modelId, huggingFaceToken?.trim() || undefined);
      const candidate = pickBestGguf(files);
      if (!candidate) {
        Alert.alert('No GGUF', 'This model does not expose a .gguf file that we can download.');
        return;
      }

      await ensureModelDirectory();
      const destination = buildModelPath(model.modelId, candidate.rfilename);
      const downloadUrl = `https://huggingface.co/${model.modelId}/resolve/main/${candidate.rfilename}`;
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
          setDownloadProgress(model.id, ratio);
        }
      );

      const result = await download.downloadAsync();
      await addModel({
        id: `${model.modelId}-${Date.now()}`,
        name: candidate.rfilename,
        path: result.uri,
        size: candidate.size ?? 0,
        source: 'huggingface',
        huggingFaceId: model.modelId,
        createdAt: new Date().toISOString(),
      });
      setLocalModel({ path: result.uri, name: candidate.rfilename });
      setInferenceProvider('local');
      Alert.alert('Model ready', 'The GGUF file was downloaded and selected for on-device chat.');
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Unable to download the model. Check your network or Hugging Face token.';
      Alert.alert('Download failed', message);
    } finally {
      setDownloadProgress(null, null);
    }
  };

  const handleImport = async () => {
    try {
      setShowAddMenu(false);
      setShowHfSearch(false);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.type !== 'success') {
        Alert.alert('Import canceled', 'No file was selected.');
        return;
      }
      const dir = await ensureModelDirectory();
      const sourceUri = result.fileCopyUri ?? result.uri;
      if (!sourceUri) {
        throw new Error('Could not resolve the selected file.');
      }
      const fileName = result.name ?? sourceUri.split('/').pop() ?? `model-${Date.now()}.gguf`;
      const destination = `${dir}${fileName}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destination });
      const info = await FileSystem.getInfoAsync(destination);
      if (!info.exists) {
        throw new Error('Failed to store the file locally.');
      }
      const storedName = result.name ?? fileName;
      await addModel({
        id: `manual-${Date.now()}`,
        name: storedName,
        path: destination,
        size: info.size ?? 0,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
      setLocalModel({ path: destination, name: storedName });
      setInferenceProvider('local');
      Alert.alert('Imported', `GGUF stored at ${storedName} and ready for on-device chat.`);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unable to import the file.');
    }
  };

  const handleUseModel = (model: LocalModel) => {
    setLocalModel({ path: model.path, name: model.name });
    setInferenceProvider('local');
    if (model.path !== localModelPath) {
      Alert.alert('Model selected', `${model.name} will be used next time you start a chat.`);
    }
  };

  const handleDelete = async (model: LocalModel) => {
    const wasActive = model.path === localModelPath;
    await removeModel(model.id);
    if (wasActive) {
      setLocalModel({ path: null, name: null });
    }
  };

  const renderLocalModel = ({ item }: { item: LocalModel }) => {
    const isActive = item.path === localModelPath;
    return (
      <View key={item.id} className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-white">{item.name}</Text>
          {isActive && (
            <Text className="text-xs font-semibold uppercase text-emerald-400">Active</Text>
          )}
        </View>
        <Text className="text-xs text-white/40">
          Source: {item.source === 'huggingface' ? item.huggingFaceId : 'Manual import'}
        </Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => handleUseModel(item)}
            className="flex-1 items-center rounded-xl border border-white/30 px-3 py-2">
            <Text className="text-sm font-semibold text-white">Use on Device</Text>
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item)}
            className="flex-1 items-center rounded-xl border border-rose-400/30 px-3 py-2">
            <Text className="text-sm font-semibold text-rose-300">Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderResult = ({ item }: { item: HuggingFaceModelSummary }) => {
    const downloading = downloadingModelId === item.id;
    return (
      <View key={item.id} className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-base font-semibold text-white">{item.modelId}</Text>
        <Text className="text-xs text-white/40">Downloads: {item.downloads.toLocaleString()}</Text>
        <View className="mt-3 flex-row items-center justify-between">
          <Pressable
            disabled={downloading}
            onPress={() => handleDownload(item)}
            className={`flex-1 items-center rounded-xl px-3 py-2 ${
              downloading
                ? 'border border-white/30 bg-white/20'
                : 'border border-emerald-400/50 bg-emerald-500/10'
            }`}>
            {downloading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-sm font-semibold text-white">
                  {downloadProgress ? `${Math.round(downloadProgress * 100)}%` : 'Preparing'}
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold text-white">Download GGUF</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="relative flex-1 bg-[#0a0a0a] px-4 pt-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-white">Models</Text>
        <Pressable onPress={() => router.back()} className="px-2 py-1">
          <Text className="text-sm text-white/60">Close</Text>
        </Pressable>
      </View>

      <View className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="mb-2 text-sm font-medium text-white/60">
          Hugging Face Token (optional)
        </Text>
        <TextInput
          value={hfTokenInput}
          onChangeText={setHfTokenInput}
          placeholder="hf_xxx..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          autoCapitalize="none"
          autoCorrect={false}
          className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
        />
        <Pressable
          onPress={handleSaveToken}
          className="items-center rounded-2xl border border-white/10 bg-emerald-500/20 px-4 py-3">
          <Text className="text-sm font-semibold text-white">Save token</Text>
        </Pressable>
        {!!huggingFaceToken && (
          <Text className="mt-2 text-xs text-white/40">Token configured for gated downloads.</Text>
        )}
      </View>

      <View className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <Text className="text-sm text-white/60">
          Choose a listing and tap **Download GGUF** to grab the weights. Use the buttons below to
          pull a model from Hugging Face or import any GGUF stored on the device.
        </Text>
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={handleImport}
            className="flex-1 items-center rounded-xl border border-white/20 bg-white/10 px-3 py-2">
            <Text className="text-sm font-semibold text-white">Import from Files</Text>
          </Pressable>
          <Pressable
            onPress={handleSearch}
            className="flex-1 items-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            {isSearching ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-white">Search Hugging Face</Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1">
          <Text className="mb-3 text-sm font-semibold text-white">Available to Download</Text>
          {CATALOG_MODELS.map((catalog) => (
            <View
              key={catalog.modelId}
              className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-white">{catalog.title}</Text>
                <Text className="text-xs text-white/40">{catalog.params}</Text>
              </View>
              <Text className="mb-1 text-xs text-white/40">Size: {catalog.size}</Text>
              <Text className="mb-3 text-xs text-white/40">Skills: {catalog.skills}</Text>
              <Pressable
                onPress={() => handleCatalogDownload(catalog)}
                className="items-center rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2">
                <Text className="text-sm font-semibold text-white">Download GGUF</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View className="mt-6">
          <Text className="mb-3 text-sm font-semibold text-white">Local models</Text>
          {models.length === 0 ? (
            <Text className="text-xs text-white/40">No models downloaded yet.</Text>
          ) : (
            models.map((item) => renderLocalModel({ item }))
          )}
        </View>

        {!canUseLocal && (
          <Text className="mt-4 text-center text-xs text-white/50">
            Select or download a GGUF model to switch on-device inference.
          </Text>
        )}
      </ScrollView>

      {showAddMenu && (
        <View className="absolute bottom-24 right-6 z-40 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-lg">
          <Pressable
            onPress={() => {
              setShowAddMenu(false);
              setShowHfSearch(true);
            }}
            className="mb-2 rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
            <Text className="text-sm font-semibold text-white">Add from Hugging Face</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setShowAddMenu(false);
              handleImport();
            }}
            className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3">
            <Text className="text-sm font-semibold text-white">Add Local Model</Text>
          </Pressable>
        </View>
      )}

      {showHfSearch && (
        <View className="absolute inset-0 z-50 bg-black/70">
          <View className="m-4 mt-16 flex-1 rounded-[32px] bg-[#111111] p-4">
            <View className="mb-3 flex-row items-center gap-2">
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search models (gemma, qwen...)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              />
              <Pressable onPress={handleSearch} className="rounded-2xl bg-emerald-500 px-4 py-3">
                {isSearching ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Search</Text>
                )}
              </Pressable>
            </View>
            {searchError && <Text className="mb-2 text-xs text-rose-300">{searchError}</Text>}
            <ScrollView className="flex-1">
              {isSearching ? (
                <View className="items-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : searchResults.length === 0 ? (
                <Text className="text-xs text-white/40">
                  Search for models to download GGUF weights.
                </Text>
              ) : (
                searchResults.map((item) => renderResult({ item }))
              )}
            </ScrollView>
            <Pressable
              onPress={() => {
                setShowHfSearch(false);
                setSearchResults([]);
              }}
              className="mt-3 items-center rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
              <Text className="text-sm font-semibold text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => setShowAddMenu((prev) => !prev)}
        className="absolute bottom-6 right-6 z-30 rounded-full border border-emerald-500/50 bg-emerald-500/60 px-4 py-3">
        <Text className="text-2xl font-bold text-white">+</Text>
      </Pressable>
    </View>
  );
}

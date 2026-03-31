import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Alert, Platform, StyleSheet } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useConnectionStore } from '@/store/connection.store';
import { routes } from '@/lib/api';
import type { OllamaModel } from '@/lib/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function ModelCard({ item, isActive, onDelete }: { item: OllamaModel; isActive: boolean; onDelete: () => void }) {
  const content = (
    <Pressable onLongPress={onDelete} style={({ pressed }) => [cs.card, pressed && cs.cardPressed]}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[16px] font-semibold text-white">{item.name}</Text>
            {isActive && (
              <View className="rounded-md bg-indigo-500/20 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-indigo-400">ACTIVE</Text>
              </View>
            )}
          </View>
          <View className="mt-2.5 flex-row flex-wrap items-center gap-3">
            <Tag label="Size" value={formatBytes(item.size)} />
            {item.details?.parameter_size && <Tag label="Params" value={item.details.parameter_size} />}
            {item.details?.quantization_level && <Tag label="Quant" value={item.details.quantization_level} />}
            {item.details?.family && <Tag label="Family" value={item.details.family} />}
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive
        style={cs.glassWrap}
      >
        {content}
      </GlassView>
    );
  }

  return <View style={cs.fallbackWrap}>{content}</View>;
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-[11px] text-white/15">{label}</Text>
      <Text className="text-[11px] font-medium text-white/40">{value}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  glassWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
  glass: { overflow: 'hidden' },
  glassInner: { backgroundColor: 'rgba(255,255,255,0.02)' },
  fallbackWrap: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 10 },
  card: { padding: 16 },
  cardPressed: { opacity: 0.7 },
});

export default function ModelsScreen() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { defaultModel, isConnected } = useConnectionStore();

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch(routes.models());
      if (res.ok) setModels(await res.json());
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadModels();
    setRefreshing(false);
  }, [loadModels]);

  const handleDelete = (name: string) => {
    Alert.alert('Delete Model', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(routes.models() + `/${encodeURIComponent(name)}`, { method: 'DELETE' });
            await loadModels();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const totalSize = models.reduce((sum, m) => sum + m.size, 0);

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      {/* Summary bar */}
      {models.length > 0 && (
        <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
          <Text className="text-[11px] text-white/25">{models.length} model{models.length !== 1 ? 's' : ''}</Text>
          <Text className="text-[11px] text-white/20">Total: {formatBytes(totalSize)}</Text>
        </View>
      )}

      <FlatList
        data={models}
        keyExtractor={(item) => item.digest}
        contentContainerStyle={
          models.length === 0
            ? { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 40 }
            : { paddingHorizontal: 16, paddingBottom: 20 }
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" colors={['#6366f1']} />
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center">
              <Text className="text-[14px] text-white/30">Loading models...</Text>
            </View>
          ) : (
            <View className="items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
                <Text className="text-2xl">🧠</Text>
              </View>
              <Text className="mb-1 text-base font-semibold text-white/50">No models found</Text>
              <Text className="text-center text-sm leading-5 text-white/25">
                {isConnected ? 'Install models from the desktop.' : 'Connect to desktop first.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ModelCard
            item={item}
            isActive={item.name === defaultModel}
            onDelete={() => handleDelete(item.name)}
          />
        )}
      />

    </View>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const name = item.name;
  const family = item.details?.family ?? '—';
  const params = item.details?.parameter_size ?? '—';
  const quant = item.details?.quantization_level ?? '—';
  const size = formatBytes(item.size);

  const familyIcon =
    family.includes('llama') ? '🦙' :
    family.includes('gemma') ? '💎' :
    family.includes('phi') ? 'Φ' :
    family.includes('qwen') ? '🌐' :
    family.includes('mistral') ? '🌀' :
    family.includes('deepseek') ? '🔍' :
    family.includes('nomic') ? '📐' :
    family.includes('codellama') ? '👨‍💻' :
    '🧠';

  const content = (
    <Pressable onLongPress={onDelete} style={({ pressed }) => pressed ? { opacity: 0.7 } : {}}>
      <View style={styles.cardInner}>
        {/* Top row: icon + name + badge */}
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
            <Text style={styles.iconText}>{familyIcon}</Text>
          </View>
          <View style={styles.nameCol}>
            <View style={styles.nameRow}>
              <Text style={styles.modelName} numberOfLines={1}>{name}</Text>
              {isActive && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.familyText}>{family}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatItem label="Size" value={size} />
          <View style={styles.statDot} />
          <StatItem label="Parameters" value={params} />
          <View style={styles.statDot} />
          <StatItem label="Quantization" value={quant} />
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
        style={styles.glassCard}
      >
        {content}
      </GlassView>
    );
  }

  return <View style={styles.fallbackCard}>{content}</View>;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 20,
    marginBottom: 12,
  },
  fallbackCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  cardInner: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  iconText: {
    fontSize: 20,
  },
  nameCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(129,140,248,0.9)',
    letterSpacing: 0.5,
  },
  familyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.2)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
  },
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
    Alert.alert('Delete Model', `Delete "${name}"? This frees disk space on the desktop.`, [
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
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#0a0a0a]" style={{ paddingTop: insets.top }}>
      {/* Summary bar */}
      {models.length > 0 && (
        <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[12px] font-semibold text-white/40">
              {models.length} model{models.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
            <Text className="text-[11px] text-white/25">Total</Text>
            <Text className="text-[11px] font-semibold text-white/40">{formatBytes(totalSize)}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={models}
        keyExtractor={(item) => item.name}
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
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.04]">
                <Text className="text-xl font-bold text-white/20">AI</Text>
              </View>
              <Text className="mb-2 text-[17px] font-semibold text-white/50">No models found</Text>
              <Text className="text-center text-[14px] leading-5 text-white/25">
                {isConnected ? 'Install models from the Atlas AI Desktop app.' : 'Connect to your desktop first.'}
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

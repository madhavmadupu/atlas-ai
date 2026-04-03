import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildSettingsForTier, LOCAL_INFERENCE_PRESETS } from '@/lib/local-inference';
import type { InferenceProvider, LocalInferenceSettings } from '@/lib/types';

interface ConnectionState {
  desktopIP: string | null;
  desktopPort: number;
  isConnected: boolean;
  defaultModel: string | null;
  inferenceProvider: InferenceProvider;
  localModelPath: string | null;
  localModelName: string | null;
  huggingFaceToken: string | null;
  localSettings: LocalInferenceSettings;
}

interface ConnectionActions {
  connectToDesktop: (ip: string, port: number) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  disconnect: () => void;
  setEndpoint: (ip: string, port: number) => void;
  setInferenceProvider: (provider: InferenceProvider) => void;
  setLocalModel: (model: { path: string; name?: string | null } | null) => void;
  setHuggingFaceToken: (token: string | null) => void;
  updateLocalSettings: (settings: Partial<LocalInferenceSettings>) => void;
  applyLocalTier: (tier: LocalInferenceSettings['performanceTier']) => void;
}

export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  persist(
    (set, get) => ({
      desktopIP: null,
      desktopPort: 3001,
      isConnected: false,
      defaultModel: null,
      inferenceProvider: 'local',
      localModelPath: null,
      localModelName: null,
      huggingFaceToken: null,
      localSettings: LOCAL_INFERENCE_PRESETS.medium,

      connectToDesktop: async (ip, port) => {
        const baseUrl = `http://${ip}:${port}`;
        try {
          const healthRes = await fetch(`${baseUrl}/api/health`);
          if (!healthRes.ok) return false;
          const health = await healthRes.json();
          if (!health.status) return false;

          let firstModel: string | null = null;
          try {
            const modelsRes = await fetch(`${baseUrl}/api/models`);
            if (modelsRes.ok) {
              const models = await modelsRes.json();
              firstModel = models[0]?.name ?? null;
            }
          } catch {
            // Models fetch is optional
          }

          set({
            desktopIP: ip,
            desktopPort: port,
            isConnected: true,
            defaultModel: firstModel,
          });
          return true;
        } catch {
          return false;
        }
      },

      checkConnection: async () => {
        const { desktopIP, desktopPort } = get();
        if (!desktopIP) return false;
        try {
          const res = await fetch(`http://${desktopIP}:${desktopPort}/api/health`);
          const ok = res.ok;
          set({ isConnected: ok });
          return ok;
        } catch {
          set({ isConnected: false });
          return false;
        }
      },

      disconnect: () => {
        set({ desktopIP: null, isConnected: false, defaultModel: null });
      },

      setEndpoint: (ip, port) => {
        set({ desktopIP: ip, desktopPort: port, isConnected: false });
      },

      setInferenceProvider: (provider) => {
        set({ inferenceProvider: provider });
      },

      setLocalModel: (model) => {
        set({
          localModelPath: model?.path ?? null,
          localModelName: model?.name ?? null,
        });
      },
      setHuggingFaceToken: (token) => {
        set({ huggingFaceToken: token });
      },
      updateLocalSettings: (settings) => {
        set((state) => ({
          localSettings: {
            ...state.localSettings,
            ...settings,
          },
        }));
      },
      applyLocalTier: (tier) => {
        set((state) => ({
          localSettings: buildSettingsForTier(tier, state.localSettings),
        }));
      },
    }),
    {
      name: '@atlas/connection',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        desktopIP: state.desktopIP,
        desktopPort: state.desktopPort,
        inferenceProvider: state.inferenceProvider,
        localModelPath: state.localModelPath,
        localModelName: state.localModelName,
        huggingFaceToken: state.huggingFaceToken,
        localSettings: state.localSettings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.localSettings = buildSettingsForTier(
            state.localSettings?.performanceTier ?? 'medium',
            state.localSettings
          );
        }
        state?.checkConnection?.();
      },
    }
  )
);

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import type { LocalModelSource } from '@/lib/types';

const STORAGE_KEY = '@atlas/local-models';

export interface LocalModel {
  id: string;
  name: string;
  path: string;
  size: number;
  source: LocalModelSource;
  huggingFaceId?: string;
  createdAt: string;
}

interface ModelState {
  models: LocalModel[];
  downloadingModelId: string | null;
  downloadProgress: number | null;
  loading: boolean;
  error: string | null;
  loadModels: () => Promise<void>;
  addModel: (model: LocalModel) => Promise<void>;
  removeModel: (id: string) => Promise<void>;
  setDownloadProgress: (modelId: string | null, progress: number | null) => void;
}

async function persist(models: LocalModel[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  downloadingModelId: null,
  downloadProgress: null,
  loading: false,
  error: null,

  loadModels: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ models: [], loading: false });
        return;
      }
      const parsed: LocalModel[] = JSON.parse(raw);
      const filtered = await Promise.all(
        parsed.map(async (model) => {
          try {
            const info = await FileSystem.getInfoAsync(model.path);
            if (!info.exists) return null;
            return model;
          } catch {
            return null;
          }
        })
      );
      const validModels = filtered.filter((model): model is LocalModel => Boolean(model));
      set({ models: validModels, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load models', loading: false });
    }
  },

  addModel: async (model: LocalModel) => {
    const { models } = get();
    const updated = [...models.filter((m) => m.path !== model.path), model];
    set({ models: updated });
    await persist(updated);
  },

  removeModel: async (id: string) => {
    const { models } = get();
    const toRemove = models.find((m) => m.id === id);
    if (toRemove) {
      try {
        await FileSystem.deleteAsync(toRemove.path, { idempotent: true });
      } catch {
        // ignore
      }
    }
    const updated = models.filter((m) => m.id !== id);
    set({ models: updated });
    await persist(updated);
  },

  setDownloadProgress: (modelId, progress) => {
    set({ downloadingModelId: modelId, downloadProgress: progress });
  },
}));

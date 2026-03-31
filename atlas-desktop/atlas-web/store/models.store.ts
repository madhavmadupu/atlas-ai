import { create } from "zustand";
import type { OllamaModel, PullProgress } from "@/lib/types";
import { API_ROUTES, DEFAULT_MODEL } from "@/lib/constants";

interface ModelsState {
  installedModels: OllamaModel[];
  activeModel: string;
  pullingModel: string | null;
  pullProgress: PullProgress | null;
  isLoading: boolean;
}

interface ModelsActions {
  loadModels: () => Promise<void>;
  setActiveModel: (name: string) => void;
  pullModel: (name: string) => Promise<void>;
  deleteModel: (name: string) => Promise<void>;
}

export const useModelsStore = create<ModelsState & ModelsActions>(
  (set, get) => ({
    installedModels: [],
    activeModel: DEFAULT_MODEL,
    pullingModel: null,
    pullProgress: null,
    isLoading: false,

    loadModels: async () => {
      set({ isLoading: true });
      try {
        const res = await fetch(API_ROUTES.models);
        if (!res.ok) throw new Error("Failed to load models");
        const data = await res.json();
        set({ installedModels: data, isLoading: false });
      } catch {
        set({ installedModels: [], isLoading: false });
      }
    },

    setActiveModel: (name: string) => {
      set({ activeModel: name });
    },

    pullModel: async (name: string) => {
      set({ pullingModel: name, pullProgress: null });
      try {
        const res = await fetch(API_ROUTES.modelsPull, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) throw new Error("Failed to pull model");
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const progress: PullProgress = JSON.parse(line.slice(6));
              set({ pullProgress: progress });
            } catch {
              // skip malformed
            }
          }
        }

        set({ pullingModel: null, pullProgress: null });
        await get().loadModels();
      } catch {
        set({ pullingModel: null, pullProgress: null });
      }
    },

    deleteModel: async (name: string) => {
      try {
        await fetch(API_ROUTES.modelsDelete(name), { method: "DELETE" });
        await get().loadModels();
      } catch {
        // Ignore
      }
    },
  }),
);

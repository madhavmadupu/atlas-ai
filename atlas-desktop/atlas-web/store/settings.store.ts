import { create } from "zustand";
import type { Settings } from "@/lib/types";
import { API_ROUTES, DEFAULT_SETTINGS } from "@/lib/constants";

interface SettingsState {
  settings: Settings;
  isLoaded: boolean;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>(
  (set, get) => ({
    settings: { ...DEFAULT_SETTINGS },
    isLoaded: false,

    loadSettings: async () => {
      try {
        const res = await fetch(API_ROUTES.settings);
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        set({ settings: { ...DEFAULT_SETTINGS, ...data }, isLoaded: true });
      } catch {
        set({ settings: { ...DEFAULT_SETTINGS }, isLoaded: true });
      }
    },

    updateSetting: async (key, value) => {
      set((state) => ({
        settings: { ...state.settings, [key]: value },
      }));

      try {
        await fetch(API_ROUTES.settings, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });
      } catch {
        // Continue — settings saved locally in state
      }
    },
  }),
);

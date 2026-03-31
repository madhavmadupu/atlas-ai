import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConnectionState {
  desktopIP: string | null;
  desktopPort: number;
  isConnected: boolean;
  defaultModel: string | null;
}

interface ConnectionActions {
  connectToDesktop: (ip: string, port: number) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  disconnect: () => void;
  setEndpoint: (ip: string, port: number) => void;
}

export const useConnectionStore = create<ConnectionState & ConnectionActions>()(
  persist(
    (set, get) => ({
      desktopIP: '192.168.0.40',
      desktopPort: 3001,
      isConnected: false,
      defaultModel: null,

      connectToDesktop: async (ip, port) => {
        const baseUrl = `http://${ip}:${port}`;
        try {
          // Health check — verify it's Atlas AI
          const healthRes = await fetch(`${baseUrl}/api/health`, {
            signal: AbortSignal.timeout?.(5000),
          });
          if (!healthRes.ok) return false;
          const health = await healthRes.json();
          // Accept any valid Atlas AI health response
          if (!health.status) return false;

          // Get available models
          let firstModel: string | null = null;
          try {
            const modelsRes = await fetch(`${baseUrl}/api/models`, {
              signal: AbortSignal.timeout?.(5000),
            });
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
          const res = await fetch(`http://${desktopIP}:${desktopPort}/api/health`, {
            signal: AbortSignal.timeout?.(3000),
          });
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
    }),
    {
      name: 'atlas-connection',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

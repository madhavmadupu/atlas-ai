import { useConnectionStore } from '@/store/connection.store';

export function getBaseUrl(): string {
  const { desktopIP, desktopPort } = useConnectionStore.getState();
  if (!desktopIP) return 'http://localhost:3001';
  return `http://${desktopIP}:${desktopPort}`;
}

export const routes = {
  health: () => `${getBaseUrl()}/api/health`,
  healthOllama: () => `${getBaseUrl()}/api/health/ollama`,
  chat: () => `${getBaseUrl()}/api/chat`,
  conversations: () => `${getBaseUrl()}/api/conversations`,
  conversation: (id: string) => `${getBaseUrl()}/api/conversations/${id}`,
  models: () => `${getBaseUrl()}/api/models`,
  settings: () => `${getBaseUrl()}/api/settings`,
};

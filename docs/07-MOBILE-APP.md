# Atlas AI — Mobile App (Expo + React Native)

## Overview

The mobile app is a polished React Native client that connects to the desktop over Wi-Fi. It has NO local model, NO local database — it is purely a UI that sends requests to the desktop's Fastify API and streams responses.

**Key behaviors:**
- On first launch: show "Connect to Desktop" screen
- After pairing: remember the desktop's IP and auto-reconnect
- All chat state is fetched from the desktop
- Streaming via SSE (EventSource or manual fetch)
- Works on iOS and Android

---

## `apps/mobile/app.json`

```json
{
  "expo": {
    "name": "Atlas AI",
    "slug": "atlas-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0a0a"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.atlasai.app",
      "infoPlist": {
        "NSLocalNetworkUsageDescription": "Atlas AI connects to your desktop over Wi-Fi to run AI models locally.",
        "NSBonjourServices": ["_atlas-ai._tcp"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0a"
      },
      "package": "com.atlasai.app",
      "permissions": ["ACCESS_NETWORK_STATE", "ACCESS_WIFI_STATE"]
    },
    "plugins": [
      "expo-router",
      "expo-camera"
    ],
    "scheme": "atlas",
    "extra": {
      "eas": { "projectId": "your-project-id" }
    }
  }
}
```

---

## `apps/mobile/app/_layout.tsx`

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#0a0a0a' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: 'Connect Desktop' }} />
        <Stack.Screen name="chat/index" options={{ title: 'Atlas AI' }} />
        <Stack.Screen
          name="chat/[id]"
          options={{ title: 'Chat', headerBackTitle: 'Chats' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

---

## `apps/mobile/app/index.tsx` — Entry / Router

```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useConnectionStore } from '@/store/connection.store';

export default function Index() {
  const router = useRouter();
  const { desktopIP, isConnected, checkConnection } = useConnectionStore();

  useEffect(() => {
    const init = async () => {
      if (!desktopIP) {
        router.replace('/connect');
        return;
      }
      const ok = await checkConnection();
      if (ok) {
        router.replace('/chat');
      } else {
        router.replace('/connect');
      }
    };
    init();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#0a0a0a]">
      <ActivityIndicator color="#6366f1" />
    </View>
  );
}
```

---

## `apps/mobile/app/connect.tsx` — Desktop Pairing Screen

```tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '@/store/connection.store';
import { QRScanner } from '@/components/connect/QRScanner';

type Mode = 'choice' | 'qr' | 'manual';

export default function ConnectScreen() {
  const [mode, setMode] = useState<Mode>('choice');
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { connectToDesktop } = useConnectionStore();

  const handleManualConnect = async () => {
    if (!ip.trim()) return;
    setLoading(true);
    try {
      const ok = await connectToDesktop(ip.trim(), 3001);
      if (ok) {
        router.replace('/chat');
      } else {
        Alert.alert('Connection failed', 'Could not reach Atlas AI on that IP. Make sure:\n• Desktop app is running\n• Both devices are on the same Wi-Fi');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQRResult = async (connectionString: string) => {
    // Parse atlas://connect?ip=...&port=...&token=...
    try {
      const url = new URL(connectionString);
      const ip = url.searchParams.get('ip');
      const port = parseInt(url.searchParams.get('port') ?? '3001');
      const token = url.searchParams.get('token');

      if (!ip || !token) throw new Error('Invalid QR code');

      setLoading(true);
      const ok = await connectToDesktop(ip, port, token);
      if (ok) {
        router.replace('/chat');
      } else {
        Alert.alert('Pairing failed', 'QR code may have expired. Generate a new one.');
      }
    } catch {
      Alert.alert('Invalid QR code', 'This does not look like an Atlas AI QR code.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'qr') {
    return <QRScanner onResult={handleQRResult} onCancel={() => setMode('choice')} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerStyle={{ padding: 24, paddingTop: 60 }}
    >
      <Text className="text-center text-4xl">◎</Text>
      <Text className="mt-4 text-center text-2xl font-semibold text-white">
        Connect to Desktop
      </Text>
      <Text className="mt-2 text-center text-sm text-white/40">
        Atlas AI runs on your desktop. Connect your phone to use it on the go.
      </Text>

      {mode === 'choice' && (
        <View className="mt-10 gap-3">
          <Pressable
            onPress={() => setMode('qr')}
            className="items-center rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <Text className="text-2xl">📷</Text>
            <Text className="mt-2 text-base font-medium text-white">Scan QR Code</Text>
            <Text className="mt-1 text-sm text-white/40">
              Open Atlas AI on desktop → Settings → Mobile Connect
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode('manual')}
            className="items-center rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <Text className="text-2xl">⌨️</Text>
            <Text className="mt-2 text-base font-medium text-white">Enter IP manually</Text>
            <Text className="mt-1 text-sm text-white/40">
              Find your desktop's local IP in Settings → Network
            </Text>
          </Pressable>
        </View>
      )}

      {mode === 'manual' && (
        <View className="mt-10 gap-4">
          <Text className="text-sm text-white/60">Desktop IP address</Text>
          <TextInput
            value={ip}
            onChangeText={setIp}
            placeholder="192.168.1.100"
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="numeric"
            autoFocus
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />
          <Text className="text-xs text-white/30">
            Port 3001 is used automatically. Make sure the Atlas desktop app is running.
          </Text>

          <Pressable
            onPress={handleManualConnect}
            disabled={loading || !ip.trim()}
            className="mt-2 items-center rounded-xl bg-indigo-600 py-4"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-semibold text-white">Connect</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setMode('choice')}>
            <Text className="text-center text-sm text-white/40">Back</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
```

---

## `apps/mobile/app/chat/index.tsx` — Conversation List

```tsx
import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { formatRelativeTime, truncate } from '@atlas/shared/utils';
import type { Conversation } from '@atlas/shared/types';

export default function ChatListScreen() {
  const router = useRouter();
  const { conversations, loadConversations, createConversation } = useChatStore();
  const { desktopIP, defaultModel } = useConnectionStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const handleNew = async () => {
    const id = await createConversation(defaultModel ?? 'llama3.2:3b');
    router.push(`/chat/${id}`);
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <Pressable
      onPress={() => router.push(`/chat/${item.id}`)}
      className="border-b border-white/5 px-5 py-4 active:bg-white/5"
    >
      <Text className="text-base font-medium text-white" numberOfLines={1}>
        {item.title}
      </Text>
      <View className="mt-1 flex-row items-center gap-2">
        <Text className="text-xs text-white/30">{item.model}</Text>
        <Text className="text-xs text-white/20">·</Text>
        <Text className="text-xs text-white/30">
          {formatRelativeTime(item.updated_at)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      <View className="flex-row items-center justify-between border-b border-white/10 px-5 py-4">
        <Text className="text-xl font-semibold text-white">Chats</Text>
        <Pressable
          onPress={handleNew}
          className="h-9 w-9 items-center justify-center rounded-full bg-indigo-600"
        >
          <Plus size={18} color="white" />
        </Pressable>
      </View>

      {conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-4xl">◎</Text>
          <Text className="text-white/50">No conversations yet</Text>
          <Pressable onPress={handleNew} className="mt-4 rounded-xl bg-indigo-600 px-6 py-3">
            <Text className="font-semibold text-white">Start chatting</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );
}
```

---

## `apps/mobile/app/chat/[id].tsx` — Mobile Chat View

```tsx
import { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useChatStore } from '@/store/chat.store';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { Message } from '@atlas/shared/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);
  const { messages, isStreaming, streamingContent, loadConversation } = useChatStore();
  const { sendMessage } = useStreamingResponse(id);

  useEffect(() => {
    loadConversation(id);
  }, [id]);

  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent]);

  const data: Array<Message | { id: 'streaming'; isStreaming: true }> = [
    ...messages,
    ...(isStreaming ? [{ id: 'streaming' as const, isStreaming: true as const }] : []),
  ];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0a0a0a]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => {
          if ('isStreaming' in item) {
            return (
              <TypingIndicator content={streamingContent} />
            );
          }
          return <MessageBubble message={item} />;
        }}
      />
      <View className="border-t border-white/10 px-4 py-3">
        <MessageInput onSend={sendMessage} disabled={isStreaming} />
      </View>
    </KeyboardAvoidingView>
  );
}
```

---

## `apps/mobile/store/connection.store.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthResponse } from '@atlas/shared/types';

interface ConnectionStore {
  desktopIP: string | null;
  desktopPort: number;
  isConnected: boolean;
  defaultModel: string | null;

  connectToDesktop: (ip: string, port: number, token?: string) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      desktopIP: null,
      desktopPort: 3001,
      isConnected: false,
      defaultModel: null,

      connectToDesktop: async (ip, port, token) => {
        const baseUrl = `http://${ip}:${port}`;

        try {
          // If token provided, verify pairing
          if (token) {
            const verifyRes = await fetch(`${baseUrl}/api/pairing/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
              signal: AbortSignal.timeout(5000),
            });
            if (!verifyRes.ok) return false;
          }

          // Health check
          const healthRes = await fetch(`${baseUrl}/api/health`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!healthRes.ok) return false;
          const health: HealthResponse = await healthRes.json();
          if (health.app !== 'atlas-ai') return false;

          // Get available models
          const modelsRes = await fetch(`${baseUrl}/api/models`, {
            signal: AbortSignal.timeout(5000),
          });
          const models = await modelsRes.json();
          const firstModel = models[0]?.name ?? null;

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
            signal: AbortSignal.timeout(3000),
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
    }),
    {
      name: 'atlas-connection',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

---

## `apps/mobile/hooks/useStreamingResponse.ts`

```typescript
import { useCallback } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';
import { API_ROUTES } from '@atlas/shared/constants';

export function useStreamingResponse(conversationId: string) {
  const { addUserMessage, startStreaming, appendStreamToken, finishStreaming, messages } =
    useChatStore();
  const { desktopIP, desktopPort, defaultModel } = useConnectionStore();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!desktopIP) return;

      addUserMessage(content);
      startStreaming();

      const baseUrl = `http://${desktopIP}:${desktopPort}`;

      try {
        const allMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content },
        ];

        const response = await fetch(`${baseUrl}${API_ROUTES.chat}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            model: defaultModel ?? 'llama3.2:3b',
            messages: allMessages,
          }),
        });

        if (!response.ok) throw new Error('Chat request failed');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.token) appendStreamToken(event.token);
              if (event.done) {
                finishStreaming(conversationId);
                return;
              }
            } catch {
              // Skip
            }
          }
        }
      } catch (err) {
        console.error('Mobile stream error:', err);
        finishStreaming(conversationId);
      }
    },
    [conversationId, desktopIP, desktopPort, defaultModel, messages],
  );

  return { sendMessage };
}
```

---

## `apps/mobile/package.json`

```json
{
  "name": "mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@atlas/shared": "workspace:*",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "expo": "^51.0.0",
    "expo-router": "~3.5.0",
    "expo-camera": "~15.0.0",
    "expo-status-bar": "~1.12.0",
    "lucide-react-native": "^0.400.0",
    "nativewind": "^4.0.1",
    "react": "18.3.0",
    "react-native": "0.74.0",
    "react-native-gesture-handler": "~2.17.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0",
    "react-native-svg": "15.2.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0"
  }
}
```
# Atlas AI — Mobile Application (Complete System Reference)

> **Scope:** This document covers everything specific to the mobile application — Expo/React Native setup, NativeWind styling, Expo Router navigation, Zustand state management, LAN connection to desktop, SSE streaming over Wi-Fi, QR pairing, platform-specific configuration, components, hooks, and troubleshooting. For desktop, see `DESKTOP.md`.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Current Implementation State](#current-implementation-state)
3. [Architecture & Communication Model](#architecture--communication-model)
4. [Tech Stack](#tech-stack)
5. [Directory Structure](#directory-structure)
6. [App Configuration (`app.json`)](#app-configuration-appjson)
7. [Expo Router Navigation](#expo-router-navigation)
8. [NativeWind Styling](#nativewind-styling)
9. [Desktop Connection System](#desktop-connection-system)
10. [QR Code Pairing Flow](#qr-code-pairing-flow)
11. [Chat System](#chat-system)
12. [SSE Streaming Over LAN](#sse-streaming-over-lan)
13. [Zustand State Management](#zustand-state-management)
14. [UI Components](#ui-components)
15. [Screens Reference](#screens-reference)
16. [Hooks](#hooks)
17. [Platform-Specific Configuration](#platform-specific-configuration)
18. [Configuration Files](#configuration-files)
19. [Build & Distribution](#build--distribution)
20. [Development Workflow](#development-workflow)
21. [Environment Variables](#environment-variables)
22. [Error Handling & Connectivity](#error-handling--connectivity)
23. [Performance Considerations](#performance-considerations)
24. [Troubleshooting](#troubleshooting)
25. [File Naming Conventions](#file-naming-conventions)
26. [Dependency Policy](#dependency-policy)

---

## System Overview

The Atlas AI mobile app is a **thin client** that connects to the Atlas AI desktop app over Wi-Fi LAN. It:

- **Does NOT run any AI model locally** — all inference happens on the desktop
- **Does NOT have its own database** — all data is fetched from the desktop's Fastify API
- **Connects over Wi-Fi LAN** to `http://[desktop-IP]:3001`
- **Streams responses** via SSE (Server-Sent Events) over HTTP
- **Persists only connection info** locally (desktop IP, port, last model) via AsyncStorage
- Works on **iOS and Android** (web variant also available)

The mobile app is a polished, native chat interface that makes the desktop's local AI accessible from a phone — all while staying completely offline (no internet required, only local network).

---

## Current Implementation State

> **Important:** The documentation below describes both the current state and the full target architecture.

### What exists now (actual files on disk):

```
atlas-mobile/
├── app/
│   ├── _layout.tsx              # Root layout (SafeAreaProvider + Stack)
│   ├── index.tsx                # Home screen (template with navigation)
│   ├── details.tsx              # Details screen (example with route params)
│   ├── +html.tsx                # Web HTML wrapper
│   └── +not-found.tsx           # 404 handler
├── components/
│   ├── Button.tsx               # Custom styled button
│   ├── Container.tsx            # Safe area container
│   ├── EditScreenInfo.tsx       # Template info component
│   └── ScreenContent.tsx        # Screen template component
├── store/
│   └── store.ts                 # Zustand example (bears state — placeholder)
├── assets/
│   ├── icon.png                 # App icon
│   ├── adaptive-icon.png        # Android adaptive icon
│   ├── splash.png               # Splash screen
│   └── favicon.png              # Web favicon
├── app.json                     # Expo configuration
├── babel.config.js              # Babel presets (Expo + NativeWind)
├── metro.config.js              # Metro bundler (NativeWind integration)
├── tailwind.config.js           # Tailwind config (NativeWind preset)
├── global.css                   # Tailwind directives
├── tsconfig.json                # TypeScript config (extends expo/tsconfig.base)
├── eslint.config.js             # ESLint (Expo + Prettier)
├── prettier.config.js           # Prettier formatting
├── cesconfig.jsonc              # Create Expo Stack metadata
├── expo-env.d.ts                # Expo environment types
├── nativewind-env.d.ts          # NativeWind environment types
├── package.json                 # Dependencies
└── package-lock.json
```

### What needs to be built:

- Connection flow (`connect.tsx` screen, QR scanner)
- Chat screens (`chat/index.tsx` conversation list, `chat/[id].tsx` chat view)
- Settings screen
- Connection store (`connection.store.ts` with AsyncStorage)
- Chat store (`chat.store.ts`)
- Streaming hook (`useStreamingResponse.ts`)
- Chat components (MessageBubble, MessageInput, TypingIndicator)
- Connect components (QRScanner)
- Replace placeholder home/details screens with actual app flows

### Current dependencies (package.json):

```json
{
  "dependencies": {
    "@expo/vector-icons": "^15.0.2",
    "@react-navigation/native": "^7.1.6",
    "expo": "^54.0.0",
    "expo-constants": "~18.0.9",
    "expo-linking": "~8.0.8",
    "expo-router": "~6.0.10",
    "expo-status-bar": "~3.0.8",
    "expo-system-ui": "~6.0.7",
    "expo-web-browser": "~15.0.7",
    "nativewind": "latest",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-web": "^0.21.0",
    "react-native-worklets": "0.5.1",
    "zustand": "^4.5.1"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~19.1.10",
    "eslint": "^9.25.1",
    "eslint-config-expo": "~10.0.0",
    "eslint-config-prettier": "^10.1.2",
    "prettier": "^3.2.5",
    "tailwindcss": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.5.11",
    "typescript": "~5.9.2"
  }
}
```

### Additional dependencies needed (planned):

```json
{
  "dependencies": {
    "@atlas/shared": "workspace:*",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "expo-camera": "~15.0.0",
    "lucide-react-native": "^0.400.0",
    "react-native-svg": "15.2.0"
  }
}
```

---

## Architecture & Communication Model

The mobile app has a simple client-server relationship with the desktop:

```
┌──────────────────────────────────────────────────┐
│              ATLAS AI DESKTOP                      │
│                                                    │
│  ┌──────────────┐    ┌──────────────┐             │
│  │   Ollama     │    │   SQLite     │             │
│  │   (LLM)     │    │   (Data)     │             │
│  │   :11434     │    │              │             │
│  └──────┬───────┘    └──────┬───────┘             │
│         │                    │                     │
│         └────────┬───────────┘                     │
│                  │                                  │
│         ┌────────┴────────┐                        │
│         │  Fastify API    │                        │
│         │  :3001          │                        │
│         │  (0.0.0.0)      │    LAN IP: 192.168.x.x│
│         └────────┬────────┘                        │
│                  │                                  │
└──────────────────┼─────────────────────────────────┘
                   │
            Wi-Fi LAN (HTTP)
                   │
┌──────────────────┼─────────────────────────────────┐
│                  │                                  │
│    ATLAS AI MOBILE (Expo / React Native)            │
│                                                     │
│    ┌─────────────┴──────────────┐                  │
│    │   HTTP Client              │                  │
│    │   → http://192.168.x.x:3001│                  │
│    └─────────────┬──────────────┘                  │
│                  │                                  │
│    ┌─────────────┴──────────────┐                  │
│    │   Connection Store         │                  │
│    │   (AsyncStorage)           │                  │
│    │   Persists: IP, port,      │                  │
│    │   model, connected state   │                  │
│    └─────────────┬──────────────┘                  │
│                  │                                  │
│    ┌─────────────┴──────────────┐                  │
│    │   Chat Store (Zustand)     │                  │
│    │   conversations, messages, │                  │
│    │   streaming state          │                  │
│    └────────────────────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Key principles:

1. **Mobile never accesses SQLite directly** — all data through Fastify HTTP API
2. **Mobile never talks to Ollama directly** — Fastify proxies all LLM requests
3. **Only connection info stored locally** — desktop IP/port in AsyncStorage
4. **Same API as desktop UI** — mobile uses identical Fastify endpoints
5. **Both devices must be on the same Wi-Fi network**

### API endpoints used by mobile:

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Verify desktop is reachable, get app identity |
| `POST /api/pairing/verify` | Verify QR pairing token |
| `GET /api/models` | Get available models list |
| `GET /api/conversations` | List all conversations |
| `GET /api/conversations/:id` | Get conversation with messages |
| `POST /api/conversations` | Create new conversation |
| `DELETE /api/conversations/:id` | Delete conversation |
| `POST /api/chat` | Send message, receive SSE stream |

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Expo | SDK 54 | Managed workflow |
| Runtime | React Native | 0.81.5 | iOS + Android |
| React | React | 19.1.0 | Latest with hooks |
| Navigation | Expo Router | 6.0.10 | File-based routing |
| Styling | NativeWind | latest | Tailwind CSS for React Native |
| State management | Zustand | 4.5.1 | With AsyncStorage persistence |
| Local storage | AsyncStorage | 2.0+ | Connection persistence only |
| Icons | Lucide React Native | 0.400+ | SVG icons (requires react-native-svg) |
| Animations | React Native Reanimated | 4.1.1 | Required by NativeWind |
| Gestures | React Native Gesture Handler | 2.28.0 | Swipe-to-delete, pull-to-refresh |
| QR Scanner | expo-camera | 15.0+ | Camera-based QR code scanning |
| Language | TypeScript | 5.9.2 | Strict mode |
| Bundler | Metro | via Expo | With NativeWind plugin |
| Platforms | iOS + Android | iOS 17+, Android 14+ | Web also supported |

---

## Directory Structure

### Current structure:

```
atlas-mobile/
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root layout (providers, navigation)
│   ├── index.tsx                # Entry / router (redirects based on connection)
│   ├── details.tsx              # Placeholder (to be replaced)
│   ├── +html.tsx                # Web HTML wrapper
│   └── +not-found.tsx           # 404 handler
├── components/                  # Reusable components
│   ├── Button.tsx
│   ├── Container.tsx
│   ├── EditScreenInfo.tsx
│   └── ScreenContent.tsx
├── store/                       # Zustand stores
│   └── store.ts                 # Placeholder bears store
└── assets/                      # Static assets
```

### Target structure (planned):

```
atlas-mobile/
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root layout (providers, Stack nav, dark theme)
│   ├── index.tsx                # Entry router (check connection → redirect)
│   ├── connect.tsx              # Desktop pairing (QR scan + manual IP)
│   ├── settings.tsx             # Settings screen
│   ├── chat/
│   │   ├── index.tsx            # Conversation list
│   │   └── [id].tsx             # Individual chat view
│   ├── +html.tsx                # Web HTML wrapper
│   └── +not-found.tsx           # 404 handler
│
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx    # User/assistant message rendering
│   │   ├── MessageInput.tsx     # Text input + send button
│   │   └── TypingIndicator.tsx  # Streaming indicator
│   ├── connect/
│   │   └── QRScanner.tsx        # Camera-based QR scanner
│   ├── Button.tsx               # Reusable styled button
│   ├── Container.tsx            # Safe area container
│   └── ScreenContent.tsx        # Screen template
│
├── hooks/
│   └── useStreamingResponse.ts  # SSE streaming over LAN
│
├── store/
│   ├── connection.store.ts      # Desktop connection state (AsyncStorage)
│   └── chat.store.ts            # Conversations + messages state
│
├── assets/
│   ├── icon.png                 # App icon (1024x1024)
│   ├── adaptive-icon.png        # Android adaptive icon
│   ├── splash.png               # Splash screen
│   └── favicon.png              # Web favicon
│
├── app.json                     # Expo configuration
├── babel.config.js              # Babel presets
├── metro.config.js              # Metro bundler + NativeWind
├── tailwind.config.js           # Tailwind config
├── global.css                   # Tailwind directives
├── tsconfig.json                # TypeScript config
├── eslint.config.js             # ESLint config
├── prettier.config.js           # Prettier config
└── package.json
```

---

## App Configuration (`app.json`)

### Current configuration:

```json
{
  "expo": {
    "name": "atlas-mobile",
    "slug": "atlas-mobile",
    "version": "1.0.0",
    "scheme": "atlas-mobile",
    "platforms": ["ios", "android"],
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true,
      "tsconfigPaths": true
    },
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

### Target configuration (planned changes):

```json
{
  "expo": {
    "name": "Atlas AI",
    "slug": "atlas-ai",
    "version": "1.0.0",
    "scheme": "atlas",
    "userInterfaceStyle": "dark",
    "splash": {
      "backgroundColor": "#0a0a0a"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.atlasai.app",
      "infoPlist": {
        "NSLocalNetworkUsageDescription": "Atlas AI connects to your desktop over Wi-Fi to run AI models locally.",
        "NSBonjourServices": ["_atlas-ai._tcp"],
        "NSCameraUsageDescription": "Atlas AI uses the camera to scan QR codes to connect to your desktop."
      }
    },
    "android": {
      "package": "com.atlasai.app",
      "permissions": ["ACCESS_NETWORK_STATE", "ACCESS_WIFI_STATE"],
      "adaptiveIcon": {
        "backgroundColor": "#0a0a0a"
      }
    },
    "plugins": [
      "expo-router",
      "expo-camera"
    ],
    "extra": {
      "eas": { "projectId": "your-project-id" }
    }
  }
}
```

### Key configuration notes:

| Setting | Value | Why |
|---|---|---|
| `scheme` | `atlas` | Deep linking: `atlas://connect?ip=...` |
| `userInterfaceStyle` | `dark` | Matches desktop dark-only design |
| `typedRoutes` | `true` | Type-safe navigation with Expo Router |
| `tsconfigPaths` | `true` | Enables `@/` path alias from tsconfig |
| `supportsTablet` | `false` | Phone-only app |
| `NSLocalNetworkUsageDescription` | Set | iOS requires explanation for LAN access |
| `ACCESS_NETWORK_STATE` | Set | Android: check network connectivity |
| `ACCESS_WIFI_STATE` | Set | Android: check Wi-Fi connectivity |

---

## Expo Router Navigation

### Route structure:

```
app/
├── _layout.tsx        → Root layout (Stack navigator, providers)
├── index.tsx          → Entry (checks connection, redirects)
├── connect.tsx        → Pairing screen (QR + manual IP)
├── settings.tsx       → Settings
├── chat/
│   ├── index.tsx      → Conversation list
│   └── [id].tsx       → Individual chat
├── +html.tsx          → Web wrapper
└── +not-found.tsx     → 404
```

### Navigation flow:

```
App Launch
  │
  ├── No saved IP → /connect (pairing screen)
  │                     │
  │                     ├── QR scan → verify → /chat
  │                     └── Manual IP → verify → /chat
  │
  ├── Saved IP + connection OK → /chat (conversation list)
  │                                   │
  │                                   └── Tap conversation → /chat/[id]
  │                                   └── New chat → /chat/[id]
  │
  └── Saved IP + connection FAILED → /connect (re-pair)
```

### Root layout (`app/_layout.tsx`):

**Current:**
```tsx
import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Stack />
    </SafeAreaProvider>
  );
}
```

**Target:**
```tsx
import '../global.css';
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

### Entry screen (`app/index.tsx`) — Connection router:

**Target implementation:**
```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useConnectionStore } from '@/store/connection.store';

export default function Index() {
  const router = useRouter();
  const { desktopIP, checkConnection } = useConnectionStore();

  useEffect(() => {
    const init = async () => {
      if (!desktopIP) {
        router.replace('/connect');
        return;
      }
      const ok = await checkConnection();
      router.replace(ok ? '/chat' : '/connect');
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

## NativeWind Styling

NativeWind brings Tailwind CSS to React Native. The mobile app uses the same design language as desktop.

### Current setup:

**`tailwind.config.js`:**
```javascript
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

**`metro.config.js`:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

**`babel.config.js`:**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NativeWind v4 uses metro.config.js, not babel plugin
    // But react-native-reanimated plugin is still needed:
    // plugins: ['react-native-reanimated/plugin'],
  };
};
```

**`global.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Usage pattern in components:

```tsx
// NativeWind allows className prop on RN components
import { View, Text, Pressable } from 'react-native';

export function MyComponent() {
  return (
    <View className="flex-1 items-center justify-center bg-[#0a0a0a]">
      <Text className="text-2xl font-semibold text-white">Hello</Text>
      <Pressable className="mt-4 rounded-xl bg-indigo-600 px-6 py-3 active:bg-indigo-500">
        <Text className="font-semibold text-white">Press me</Text>
      </Pressable>
    </View>
  );
}
```

### Style object pattern (alternative):

```tsx
// For reusable styles within a file
const styles = {
  container: 'flex flex-1 bg-white',
  title: 'text-2xl font-bold text-black',
};

<View className={styles.container}>
  <Text className={styles.title}>Title</Text>
</View>
```

### Design tokens (matching desktop):

| Element | Tailwind Class | Hex |
|---|---|---|
| App background | `bg-[#0a0a0a]` | `#0a0a0a` |
| Header/card background | `bg-[#111111]` | `#111111` |
| Border | `border-white/10` | `rgba(255,255,255,0.1)` |
| Primary text | `text-white` | `#ffffff` |
| Secondary text | `text-white/60` | `rgba(255,255,255,0.6)` |
| Tertiary text | `text-white/40` | `rgba(255,255,255,0.4)` |
| Muted text | `text-white/30` | `rgba(255,255,255,0.3)` |
| Accent button | `bg-indigo-600` | `#4f46e5` |
| Accent hover | `bg-indigo-500` | `#6366f1` |
| User bubble | `bg-indigo-600` | `#4f46e5` |
| Assistant bubble | `bg-white/5` | `rgba(255,255,255,0.05)` |

### NativeWind caveats:

- Not all Tailwind utilities work in React Native (e.g., no `hover:` on mobile, use `active:`)
- `className` must be on React Native core components (`View`, `Text`, `Pressable`) or NativeWind-wrapped components
- Some CSS properties like `box-shadow` need `react-native-reanimated` or platform-specific shadow props
- Web variant may need different styles — use `Platform.OS` or responsive utilities

---

## Desktop Connection System

### Connection store (`store/connection.store.ts`):

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          // If token provided (QR scan), verify pairing
          if (token) {
            const verifyRes = await fetch(`${baseUrl}/api/pairing/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
              signal: AbortSignal.timeout(5000),
            });
            if (!verifyRes.ok) return false;
          }

          // Health check — verify it's Atlas AI
          const healthRes = await fetch(`${baseUrl}/api/health`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!healthRes.ok) return false;
          const health = await healthRes.json();
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
          const res = await fetch(
            `http://${desktopIP}:${desktopPort}/api/health`,
            { signal: AbortSignal.timeout(3000) }
          );
          set({ isConnected: res.ok });
          return res.ok;
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

### Connection persistence:

- Desktop IP, port, and default model are persisted in AsyncStorage
- On app launch, `index.tsx` checks if saved IP is reachable
- If reachable → go to chat; if not → go to connect screen
- Connection info survives app restarts and updates

### Connection verification:

```
1. fetch GET /api/health (5s timeout)
2. Check response.app === 'atlas-ai'
3. If QR token: POST /api/pairing/verify
4. fetch GET /api/models to get available models
5. Save IP + port + first model to AsyncStorage
```

---

## QR Code Pairing Flow

### End-to-end flow:

```
DESKTOP                              MOBILE
────────                              ──────
1. Settings → "Show QR Code"
2. GET /api/pairing/token
3. Generates token + connectionString
4. Renders QR code from:
   atlas://connect?ip=192.168.1.100
     &port=3001&token=abc123def456
                                      5. Open QR scanner (expo-camera)
                                      6. Scan → parse connectionString
                                      7. Extract ip, port, token
                                      8. POST /api/pairing/verify {token}
9. Validates token (single-use)
10. Returns { success, lanIP, port }
                                      11. Save connection to AsyncStorage
                                      12. Navigate to /chat
```

### QR scanner component:

```tsx
import { Camera } from 'expo-camera';

export function QRScanner({ onResult, onCancel }) {
  const [permission, requestPermission] = Camera.useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // Camera with barcode scanning
  // onBarcodeScanned → extract data → onResult(connectionString)
}
```

### Connection string format:

```
atlas://connect?ip=192.168.1.100&port=3001&token=a1b2c3d4e5f6...
```

### Pairing token rules:

- Generated by desktop: `crypto.randomBytes(16).toString('hex')`
- Single-use: consumed on verification
- Expires after 5 minutes
- Stored in-memory on desktop (cleared on restart)

---

## Chat System

### Conversation list (`app/chat/index.tsx`):

```tsx
export default function ChatListScreen() {
  const { conversations, loadConversations, createConversation } = useChatStore();
  const { defaultModel } = useConnectionStore();

  useEffect(() => { loadConversations(); }, []);

  // FlatList of conversations
  // Each item: title, model name, relative time
  // "+" button to create new conversation
  // Empty state: "No conversations yet" + "Start chatting" button
}
```

### Chat view (`app/chat/[id].tsx`):

```tsx
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, isStreaming, streamingContent, loadConversation } = useChatStore();
  const { sendMessage } = useStreamingResponse(id);

  useEffect(() => { loadConversation(id); }, [id]);

  // KeyboardAvoidingView wrapper
  // FlatList of messages + streaming indicator
  // Auto-scroll on new content
  // MessageInput at bottom with border
}
```

### Keyboard handling:

```tsx
<KeyboardAvoidingView
  className="flex-1 bg-[#0a0a0a]"
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={90}
>
  {/* FlatList + MessageInput */}
</KeyboardAvoidingView>
```

- **iOS:** `behavior="padding"` — pushes content up
- **Android:** `behavior="height"` — resizes container
- `keyboardVerticalOffset` accounts for navigation header height

---

## SSE Streaming Over LAN

### `hooks/useStreamingResponse.ts`:

```typescript
import { useCallback } from 'react';
import { useChatStore } from '@/store/chat.store';
import { useConnectionStore } from '@/store/connection.store';

export function useStreamingResponse(conversationId: string) {
  const {
    addUserMessage, startStreaming, appendStreamToken, finishStreaming, messages,
  } = useChatStore();
  const { desktopIP, desktopPort, defaultModel } = useConnectionStore();

  const sendMessage = useCallback(async (content: string) => {
    if (!desktopIP) return;

    addUserMessage(content);
    startStreaming();

    const baseUrl = `http://${desktopIP}:${desktopPort}`;

    try {
      const allMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      const response = await fetch(`${baseUrl}/api/chat`, {
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
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error('Mobile stream error:', err);
      finishStreaming(conversationId);
    }
  }, [conversationId, desktopIP, desktopPort, defaultModel, messages]);

  return { sendMessage };
}
```

### SSE stream format (same as desktop):

```
data: {"token":"Hello"}\n\n
data: {"token":" there"}\n\n
data: {"done":true}\n\n
```

### Streaming reliability:

React Native's `fetch` with `ReadableStream` can be unreliable on some platforms. Fallback options:

**Option 1: `react-native-sse` polyfill (recommended fallback)**
```bash
pnpm add react-native-sse
```

```typescript
import EventSource from 'react-native-sse';

const es = new EventSource(`http://${ip}:3001/api/chat`, {
  method: 'POST',
  body: JSON.stringify({ model, messages }),
  headers: { 'Content-Type': 'application/json' },
});

es.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  if (event.token) appendStreamToken(event.token);
  if (event.done) { es.close(); finishStreaming(); }
});
```

**Option 2: Full response (no streaming, simpler but worse UX)**
```typescript
const response = await fetch(url, { method: 'POST', body: ... });
const text = await response.text();  // Wait for complete response
```

---

## Zustand State Management

### `store/connection.store.ts` — Connection state

```typescript
interface ConnectionStore {
  desktopIP: string | null;         // e.g., "192.168.1.100"
  desktopPort: number;              // Default: 3001
  isConnected: boolean;
  defaultModel: string | null;      // e.g., "llama3.2:3b"

  connectToDesktop: (ip: string, port: number, token?: string) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  disconnect: () => void;
}

// Persisted to AsyncStorage under key 'atlas-connection'
```

### `store/chat.store.ts` — Chat state

```typescript
interface ChatStore {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  createConversation: (model: string) => Promise<string>;
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendStreamToken: (token: string) => void;
  finishStreaming: (conversationId: string) => void;
}
```

### Store pattern:

```typescript
export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: [],
  // ...

  loadConversations: async () => {
    const { desktopIP, desktopPort } = useConnectionStore.getState();
    if (!desktopIP) return;
    const res = await fetch(`http://${desktopIP}:${desktopPort}/api/conversations`);
    const conversations = await res.json();
    set({ conversations });
  },

  // All data fetched from desktop's Fastify API
  // Never from local storage (except connection info)
}));
```

### Key difference from desktop stores:

| Aspect | Desktop Store | Mobile Store |
|---|---|---|
| API base URL | `http://localhost:3001` | `http://${desktopIP}:${desktopPort}` |
| Data source | Same machine (Fastify) | Remote machine over LAN |
| Persistence | None (API is source of truth) | Connection info only (AsyncStorage) |
| Error handling | Minimal (localhost is reliable) | Must handle network failures |
| Shared types | `@atlas/shared` import | `@atlas/shared` import (same) |

---

## UI Components

### MessageBubble (React Native):

```tsx
import { View, Text } from 'react-native';
import type { Message } from '@atlas/shared/types';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <View className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'rounded-tr-sm bg-indigo-600'
            : 'rounded-tl-sm bg-white/5'
        }`}
      >
        <Text className={`text-sm ${isUser ? 'text-white' : 'text-white/90'}`}>
          {message.content}
        </Text>
        <Text className={`mt-1 text-[10px] ${isUser ? 'text-white/50' : 'text-white/30'}`}>
          {formatRelativeTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}
```

### MessageInput (React Native):

```tsx
import { View, TextInput, Pressable } from 'react-native';
import { Send, Square } from 'lucide-react-native';

export function MessageInput({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <View className="flex-row items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Message Atlas..."
        placeholderTextColor="rgba(255,255,255,0.2)"
        multiline
        className="flex-1 text-sm text-white/90"
        editable={!disabled}
        onSubmitEditing={handleSend}
      />
      <Pressable
        onPress={disabled ? undefined : handleSend}
        disabled={!disabled && !value.trim()}
        className={`h-8 w-8 items-center justify-center rounded-lg ${
          disabled ? 'bg-red-500/20' : value.trim() ? 'bg-indigo-600' : ''
        }`}
      >
        {disabled ? <Square size={14} color="#f87171" /> : <Send size={14} color="white" />}
      </Pressable>
    </View>
  );
}
```

### TypingIndicator:

```tsx
export function TypingIndicator({ content }: { content: string }) {
  return (
    <View className="mb-4 flex-row">
      <View className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3">
        <Text className="text-sm text-white/90">
          {content || '...'}
        </Text>
      </View>
    </View>
  );
}
```

### Connect screen components:

Two connection modes:
1. **QR Scan** — Camera-based, recommended, instant
2. **Manual IP** — Text input, fallback, requires typing

```tsx
type Mode = 'choice' | 'qr' | 'manual';

// 'choice' → Two cards: "Scan QR Code" and "Enter IP manually"
// 'qr' → Full-screen QRScanner component
// 'manual' → TextInput for IP + Connect button
```

---

## Screens Reference

### Screen details:

| Screen | Route | Header | Purpose |
|---|---|---|---|
| Index | `/` | Hidden | Loading spinner, redirect based on connection |
| Connect | `/connect` | "Connect Desktop" | QR scan or manual IP entry |
| Chat List | `/chat` | "Atlas AI" | FlatList of conversations + new chat button |
| Chat View | `/chat/[id]` | "Chat" (back: "Chats") | Messages + input + streaming |
| Settings | `/settings` | "Settings" | Connection info, disconnect |

### Connect screen flow:

```
┌─────────────────────────┐
│    Connect to Desktop    │
│                          │
│  ┌────────────────────┐  │
│  │   📷 Scan QR Code  │  │
│  │   Open desktop →   │  │
│  │   Settings → QR    │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │   ⌨️ Enter IP       │  │
│  │   manually         │  │
│  └────────────────────┘  │
│                          │
└─────────────────────────┘
         │
         ├── QR scan → parse → verify → /chat
         │
         └── Manual → [192.168.1.___]
                     → [Connect button]
                     → verify → /chat
                     → fail → Alert
```

### Chat list layout:

```
┌─────────────────────────┐
│  Chats              [+] │  ← Header with new chat button
├─────────────────────────┤
│  Help me with Python    │  ← Conversation title
│  llama3.2:3b · 2h ago   │  ← Model + time
├─────────────────────────┤
│  Write a poem about...  │
│  llama3.2:3b · 1d ago   │
├─────────────────────────┤
│        Empty state:     │
│           ◎             │
│    No conversations yet │
│    [Start chatting]     │
└─────────────────────────┘
```

---

## Hooks

### `useStreamingResponse(conversationId)`

See [SSE Streaming Over LAN](#sse-streaming-over-lan) section for full implementation.

Returns: `{ sendMessage: (content: string) => Promise<void> }`

---

## Platform-Specific Configuration

### iOS-specific:

| Requirement | Configuration | File |
|---|---|---|
| Local network access | `NSLocalNetworkUsageDescription` in `infoPlist` | `app.json` |
| Camera (QR scan) | `NSCameraUsageDescription` in `infoPlist` | `app.json` |
| Bonjour services | `NSBonjourServices: ["_atlas-ai._tcp"]` | `app.json` |
| Dark status bar | `StatusBar style="light"` | `_layout.tsx` |
| Keyboard avoiding | `behavior="padding"` | `chat/[id].tsx` |

### Android-specific:

| Requirement | Configuration | File |
|---|---|---|
| Network state | `ACCESS_NETWORK_STATE` permission | `app.json` |
| Wi-Fi state | `ACCESS_WIFI_STATE` permission | `app.json` |
| Adaptive icon | `adaptiveIcon.foregroundImage` | `app.json` |
| Keyboard avoiding | `behavior="height"` | `chat/[id].tsx` |

### Web-specific:

The mobile app has a web variant (via Metro web bundler):

```json
{
  "web": {
    "bundler": "metro",
    "output": "static",
    "favicon": "./assets/favicon.png"
  }
}
```

**`app/+html.tsx`** provides the HTML wrapper for the web version.

---

## Configuration Files

### `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin must be last if used
  };
};
```

### `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

### `tailwind.config.js`:

```javascript
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

### `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts", "nativewind-env.d.ts"]
}
```

### `eslint.config.js`:

```javascript
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { ignores: ['dist/*', '.expo/*', 'expo-plugins/*'] },
]);
```

### `prettier.config.js`:

```javascript
module.exports = {
  arrowParens: 'always',
  bracketSameLine: true,
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
};
```

---

## Build & Distribution

### Development:

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run android    # Build + run on Android emulator/device
npm run ios        # Build + run on iOS simulator/device
npm run web        # Run web variant
npm run prebuild   # Generate native code (for custom native modules)
```

### Production (EAS Build):

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for stores
eas build --platform ios      # iOS App Store
eas build --platform android  # Google Play Store

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Target bundle sizes:

| Platform | Format | Target Size |
|---|---|---|
| iOS | IPA | < 50 MB |
| Android | APK | < 50 MB |
| Android | AAB (Play Store) | < 40 MB |

### No OTA updates needed:

The mobile app is a thin client — all logic is in the UI layer. Model updates, conversation data, and settings all live on the desktop. The mobile app rarely needs updating.

---

## Development Workflow

### Prerequisites:

1. **Desktop app must be running** with Fastify on port 3001
2. **Ollama must be running** on the desktop with at least one model
3. **Same Wi-Fi network** for phone and desktop

### Starting development:

```bash
cd atlas-mobile

# Start Expo dev server
npm start

# Options:
# - Press 'a' for Android
# - Press 'i' for iOS (macOS only)
# - Press 'w' for web
# - Scan QR with Expo Go app
```

### Testing connection manually:

On the phone's browser, navigate to:
```
http://[desktop-IP]:3001/api/health
```

Should return:
```json
{
  "status": "ok",
  "app": "atlas-ai",
  "version": "1.0.0",
  "lanIP": "192.168.1.100",
  "timestamp": 1711900000000
}
```

### Finding desktop IP:

- **macOS:** System Settings → Network → Wi-Fi → Details → IP Address
- **Windows:** `ipconfig` → Wi-Fi adapter → IPv4 Address
- **Linux:** `ip addr show` → look for `wlan0` or `wlp*`

### Common dev commands:

```bash
npm start            # Start dev server
npm start -- --clear # Clear Metro cache and start
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run prebuild     # Generate native projects (ios/, android/)
```

---

## Environment Variables

Mobile `.env` (never committed):

```env
EXPO_PUBLIC_DEFAULT_DESKTOP_PORT=3001
```

**No secrets. No API keys. Desktop IP is entered at runtime.**

---

## Error Handling & Connectivity

### Connection states:

```
DISCONNECTED → CONNECTING → CONNECTED → STREAMING
     ↑              │            │           │
     └──────────────┘            │           │
     └───────────────────────────┘           │
     └───────────────────────────────────────┘
```

### Network error handling:

```typescript
// All fetch calls should have timeouts
const res = await fetch(url, {
  signal: AbortSignal.timeout(5000),  // 5s for connections
});

// Stream timeout
const res = await fetch(chatUrl, {
  signal: AbortSignal.timeout(30000), // 30s for streaming
});
```

### Error scenarios and user messages:

| Scenario | Detection | User Message |
|---|---|---|
| Desktop not running | Health check fails | "Could not reach Atlas AI. Make sure the desktop app is running." |
| Wrong IP | Health check timeout | "Connection timed out. Check the IP address." |
| Different Wi-Fi | Health check timeout | "Both devices must be on the same Wi-Fi network." |
| Firewall blocking | Health check timeout | "Connection blocked. Check firewall settings on desktop." |
| QR expired | Verify returns 401 | "QR code has expired. Generate a new one on desktop." |
| Stream interrupted | Reader error | "Connection lost during response. Try again." |
| Model not loaded | Chat returns error | "No model available. Open desktop app to download one." |

### Graceful reconnection:

```typescript
// On app resume or network change
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      checkConnection(); // Re-verify desktop is reachable
    }
  });
  return () => subscription.remove();
}, []);
```

---

## Performance Considerations

### FlatList optimization:

```tsx
<FlatList
  data={messages}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  // Performance optimizations:
  removeClippedSubviews={true}         // Unmount off-screen items
  maxToRenderPerBatch={10}             // Render in batches
  windowSize={5}                        // Keep 5 screens of items
  initialNumToRender={20}              // Initial batch
  getItemLayout={(data, index) => ({   // Skip measurement
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Streaming performance:

- Token-by-token Zustand updates trigger re-renders
- Use `React.memo` on MessageBubble to prevent re-rendering all messages
- Only the streaming indicator component should re-render during streaming
- Consider debouncing token appends if updates are too frequent

### Network performance:

- All API calls are local network (sub-1ms latency)
- Streaming over LAN is effectively instant
- Timeout values are generous to account for slow model inference, not network latency

### Bundle size:

- Avoid large dependencies (no lodash, no moment)
- NativeWind adds minimal overhead
- expo-camera is loaded only on connect screen
- Use tree-shaking for lucide icons

---

## Troubleshooting

### Mobile can't connect to desktop:

**Checklist:**
1. Both devices on the **same Wi-Fi network**?
2. Is Atlas AI desktop app running?
3. Is Fastify listening on port 3001?
4. Is the firewall blocking port 3001?
   - macOS: System Settings → Network → Firewall → Allow Atlas AI
   - Windows: Windows Defender Firewall → Allow an app → Atlas AI.exe
5. Is the IP correct? Test: `http://[IP]:3001/api/health` in phone browser
6. Phone on cellular? Must be on Wi-Fi (phone hotspot won't work — phone needs to reach laptop's IP)

### Streaming stops mid-response:

- React Native's `fetch` with `ReadableStream` varies by platform
- Fallback: use `react-native-sse` EventSource polyfill
- Last resort: disable streaming, wait for full response

### QR scanner not working on iOS:

- Requires `NSCameraUsageDescription` in `app.json` → `ios.infoPlist`
- Must request permission explicitly:
```typescript
const [permission, requestPermission] = Camera.useCameraPermissions();
useEffect(() => { if (!permission?.granted) requestPermission(); }, []);
```

### NativeWind crashes on Android:

- Ensure `react-native-reanimated` is installed and compatible
- `babel.config.js` may need `react-native-reanimated/plugin` as last plugin
- Clear cache: `expo start --clear`

### Expo app crashes on launch:

```bash
# Clear all caches
expo start --clear
rm -rf node_modules/.cache
rm -rf .expo

# Reinstall
rm -rf node_modules
npm install
```

### TextInput not visible on Android:

- Android may not apply NativeWind styles to TextInput correctly
- Use explicit `style` prop for height/color as fallback

### Keyboard covers input on iOS:

- Ensure `KeyboardAvoidingView` with `behavior="padding"`
- Adjust `keyboardVerticalOffset` to match header height
- Wrap in `SafeAreaView` for notch devices

### "Network request failed" on real device:

- Expo Go on real device must reach desktop IP over Wi-Fi
- `localhost` doesn't work on physical devices — must use desktop's LAN IP
- Check if `http://[IP]:3001/api/health` works in phone browser first

---

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Screen (Expo Router) | `camelCase.tsx` or `[param].tsx` | `connect.tsx`, `[id].tsx` |
| Layout | `_layout.tsx` | `app/_layout.tsx` |
| Component | `PascalCase.tsx` | `MessageBubble.tsx` |
| Hook | `camelCase.ts` | `useStreamingResponse.ts` |
| Store | `camelCase.ts` | `connection.store.ts` |
| Utility | `camelCase.ts` | `format.ts` |
| Type file | `camelCase.ts` | `chat.types.ts` |
| Config | `camelCase.js` or `camelCase.config.js` | `babel.config.js` |

**Note:** Expo Router screens must use `default export` (not named exports).

---

## Dependency Policy

### Allowed:

- Expo SDK plugins for native functionality
- React Native community libraries (gesture handler, reanimated, screens)
- NativeWind for styling
- Zustand for state management
- AsyncStorage for persistence
- Lucide for icons
- expo-camera for QR scanning

### Not allowed:

- Any package that makes external network requests at runtime
- Any analytics, logging, or error tracking service
- Any package requiring an API key
- No Firebase, no Supabase, no cloud databases
- No push notification services (no cloud dependency)
- No Sentry, no Mixpanel, no PostHog

### Key constraint:

The mobile app should work on a **completely air-gapped local network** with no internet access. The only network traffic is between the phone and the desktop over Wi-Fi LAN on port 3001.

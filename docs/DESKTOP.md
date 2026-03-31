# Atlas AI — Desktop Application (Complete System Reference)

> **Scope:** This document covers everything specific to the desktop application — Electron shell, Next.js renderer, Fastify API server, SQLite database, Ollama sidecar, IPC bridge, model management, UI components, state management, build/distribution, and troubleshooting. For mobile, see `MOBILE.md`.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Current Implementation State](#current-implementation-state)
3. [Architecture & Process Model](#architecture--process-model)
4. [Tech Stack](#tech-stack)
5. [Directory Structure](#directory-structure)
6. [Electron Main Process](#electron-main-process)
7. [Ollama Sidecar Lifecycle](#ollama-sidecar-lifecycle)
8. [IPC Preload Bridge](#ipc-preload-bridge)
9. [Fastify API Server](#fastify-api-server)
10. [API Routes Reference](#api-routes-reference)
11. [SQLite Database](#sqlite-database)
12. [Next.js Renderer (Desktop UI)](#nextjs-renderer-desktop-ui)
13. [UI Components](#ui-components)
14. [Hooks](#hooks)
15. [Zustand State Management](#zustand-state-management)
16. [Streaming (SSE) Implementation](#streaming-sse-implementation)
17. [Model Management](#model-management)
18. [Settings System](#settings-system)
19. [System Tray](#system-tray)
20. [Shared Package (`@atlas/shared`)](#shared-package-atlasshared)
21. [Database Package (`@atlas/db`)](#database-package-atlasdb)
22. [Configuration Files](#configuration-files)
23. [Build & Distribution](#build--distribution)
24. [Development Workflow](#development-workflow)
25. [Environment Variables](#environment-variables)
26. [Port Reference](#port-reference)
27. [Security Model](#security-model)
28. [Performance Considerations](#performance-considerations)
29. [Troubleshooting](#troubleshooting)
30. [File Naming Conventions](#file-naming-conventions)
31. [Dependency Policy](#dependency-policy)

---

## System Overview

The Atlas AI desktop app is the **"brain"** of the entire Atlas AI system. It:

- Bundles and manages the **Ollama** LLM runtime as a sidecar process
- Runs a **Fastify HTTP/SSE API server** on port 3001 (exposed to LAN for mobile access)
- Stores all data locally in **SQLite** (conversations, messages, settings)
- Presents a **Next.js 14 App Router** UI inside an **Electron 32** BrowserWindow
- Operates **100% offline** — zero external network calls, zero telemetry, zero cloud

The desktop app serves dual roles:
1. **Standalone AI chatbot** with its own full UI
2. **Server for the mobile app** — the phone connects to the desktop over Wi-Fi LAN

---

## Current Implementation State

> **Important:** The documentation below describes the **full target architecture**. The current codebase is in early bootstrap phase.

### What exists now (actual files on disk):

```
atlas-desktop/
├── atlas-web/                  # Next.js 16.2.1 app (boilerplate)
│   ├── app/
│   │   ├── layout.tsx          # Root layout (Geist fonts, Tailwind)
│   │   ├── page.tsx            # Home page (Next.js template placeholder)
│   │   ├── globals.css         # Tailwind global styles
│   │   └── favicon.ico
│   ├── public/                 # Static assets (Next.js default SVGs)
│   ├── package.json            # next@16.2.1, react@19.2.4
│   ├── tsconfig.json           # Strict mode, ES2017, path alias @/*
│   ├── next.config.ts          # Empty config
│   ├── eslint.config.mjs       # Next.js core web vitals + TypeScript
│   ├── postcss.config.mjs      # Tailwind CSS PostCSS plugin
│   ├── CLAUDE.md               # Points to AGENTS.md
│   └── AGENTS.md               # Next.js agent rules
└── .claude/
    └── settings.local.json
```

### What needs to be built:

- Electron main process (`electron/main.ts`, `electron/preload.ts`, `electron/sidecar.ts`)
- Fastify server (`server/index.ts`, all routes, all services)
- SQLite database layer (`packages/db/`)
- Shared types/constants (`packages/shared/`)
- All UI components (chat, sidebar, setup wizard, model manager, settings)
- All Zustand stores
- All hooks (streaming, Ollama status)
- System tray
- Build/packaging pipeline

### Current dependencies (atlas-web/package.json):

```json
{
  "dependencies": {
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Target dependencies (planned):

```json
{
  "dependencies": {
    "@atlas/shared": "workspace:*",
    "@atlas/db": "workspace:*",
    "@fastify/cors": "^9.0.0",
    "fastify": "^4.28.0",
    "fastify-plugin": "^4.5.1",
    "nanoid": "^5.0.0",
    "next": "14.2.0",
    "pino-pretty": "^11.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "better-sqlite3": "^11.0.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0"
  },
  "devDependencies": {
    "electron": "^32.0.0",
    "electron-builder": "^24.9.0",
    "concurrently": "^9.0.0",
    "wait-on": "^8.0.0",
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## Architecture & Process Model

The desktop app runs **three concurrent processes**:

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                     │
│                      (Node.js runtime)                       │
│                                                              │
│  Owns: Ollama sidecar, SQLite DB, IPC handlers,             │
│        system tray, window management, app lifecycle         │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │   Ollama     │   │   SQLite     │   │  Fastify       │  │
│  │   Sidecar    │   │   Database   │   │  Server        │  │
│  │  :11434      │   │  atlas.db    │   │  :3001         │  │
│  └──────┬───────┘   └──────────────┘   └───────┬────────┘  │
│         │                                       │           │
│         │  HTTP (localhost)                      │           │
│         └───────────────────────────────────────┘           │
│                                                              │
│                    IPC (contextBridge)                        │
│                          │                                   │
├──────────────────────────┼──────────────────────────────────┤
│                          │                                   │
│              ELECTRON RENDERER PROCESS                        │
│               (Chromium + Next.js)                            │
│                                                              │
│  Owns: All UI, chat state, model management UI               │
│  Communicates with Fastify via HTTP fetch to :3001           │
│  Communicates with Main via typed IPC preload bridge         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

              ┌──────────────────────┐
              │     MOBILE APP       │
              │  (Expo/React Native) │
              │                      │
              │  HTTP over Wi-Fi LAN │
              │  → [LAN-IP]:3001     │
              └──────────────────────┘
```

### Communication paths:

| From | To | Protocol | Purpose |
|---|---|---|---|
| Renderer → Fastify | HTTP fetch | `localhost:3001` | All data operations (chat, conversations, models, settings) |
| Renderer → Main | Electron IPC | contextBridge | System operations (app info, file dialogs, native progress) |
| Fastify → Ollama | HTTP | `localhost:11434` | LLM inference, model management |
| Mobile → Fastify | HTTP | `[LAN-IP]:3001` | Same API as desktop UI uses |
| Main → Ollama | Process spawn | Child process | Sidecar lifecycle (start/stop) |

### Key design decision: HTTP-first, IPC-second

**Prefer HTTP to Fastify** for data operations — both the desktop UI and mobile use the same API. This means:
- One API implementation serves both platforms
- Desktop UI code is portable (could run as a web app)
- Easier to test (curl/Postman)

**Use IPC only** for things that only the desktop needs and can't go over HTTP:
- Checking app version (`system:getInfo`)
- Triggering model pulls with native progress UI
- System-level things (opening file dialogs, native menus)

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Desktop shell | Electron | 32 | Cross-platform: Windows, macOS, Linux |
| Desktop UI | Next.js (App Router) | 14 | Served inside Electron BrowserWindow |
| Desktop styling | Tailwind CSS + shadcn/ui | 3.4 / latest | Dark mode default, no light mode |
| Component library | shadcn/ui (Radix primitives) | latest | Accessible, customizable |
| Icons | Lucide React | latest | Tree-shakeable SVG icons |
| Markdown rendering | react-markdown + remark-gfm + rehype-highlight | 9 / 4 / 7 | For assistant message rendering |
| LLM runtime | Ollama | latest | Bundled as sidecar or downloaded on first launch |
| API bridge | Fastify | 4.28+ | `localhost:3001`, also LAN-exposed on `0.0.0.0` |
| State management | Zustand | 4.5+ | Minimal, hooks-based |
| Database | SQLite via better-sqlite3 | 11+ | Synchronous API, WAL mode |
| Language | TypeScript | 5.5+ | Strict mode everywhere |
| Monorepo | Turborepo | latest | Shared packages across apps |
| Bundler | Next.js built-in (Webpack/Turbopack) | — | Static export for production |
| Packaging | electron-builder | 24.9+ | DMG, NSIS, AppImage |

---

## Directory Structure

### Target directory structure (planned):

```
apps/desktop/
├── electron/
│   ├── main.ts                     # Electron main process entry
│   ├── preload.ts                  # IPC bridge (contextBridge)
│   ├── sidecar.ts                  # Ollama lifecycle management
│   ├── installer.ts                # Ollama first-launch downloader
│   ├── tray.ts                     # System tray setup
│   ├── ipc/
│   │   ├── chat.ipc.ts             # Chat-related IPC handlers
│   │   ├── models.ipc.ts           # Model management IPC
│   │   └── system.ipc.ts           # System info IPC
│   └── tsconfig.json               # Separate tsconfig (Node.js, CJS, no DOM)
│
├── src/                            # Next.js app (renderer)
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Inter font, dark theme, AppShell)
│   │   ├── page.tsx                # Home / redirect to chat
│   │   ├── chat/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Chat page
│   │   ├── models/
│   │   │   └── page.tsx            # Model manager
│   │   └── settings/
│   │       └── page.tsx            # Settings page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Sidebar + main content wrapper
│   │   │   ├── Sidebar.tsx         # Conversation list sidebar
│   │   │   └── TitleBar.tsx        # Custom window title bar
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx      # Message list + input
│   │   │   ├── MessageBubble.tsx   # User/assistant message bubble
│   │   │   ├── MessageInput.tsx    # Auto-resize textarea + send
│   │   │   └── StreamingCursor.tsx # Blinking cursor animation
│   │   ├── models/
│   │   │   ├── ModelDownloadProgress.tsx
│   │   │   └── ModelSelector.tsx   # Dropdown to switch model
│   │   └── setup/
│   │       └── SetupWizard.tsx     # First-launch wizard
│   ├── hooks/
│   │   ├── useStreamingResponse.ts # SSE fetch + state management
│   │   └── useOllamaStatus.ts     # Ollama health polling
│   ├── store/
│   │   ├── chat.store.ts           # Conversations + messages state
│   │   ├── models.store.ts         # Installed models + pull state
│   │   └── settings.store.ts       # App settings state
│   ├── lib/
│   │   └── utils.ts                # cn() helper, etc.
│   └── globals.css                 # Tailwind base + custom styles
│
├── server/                         # Fastify API server
│   ├── index.ts                    # Server entry, startup, LAN IP
│   ├── routes/
│   │   ├── chat.routes.ts          # POST /api/chat (SSE streaming)
│   │   ├── models.routes.ts        # GET/POST/DELETE /api/models
│   │   ├── health.routes.ts        # GET /api/health, /api/health/ollama
│   │   ├── pairing.routes.ts       # GET/POST /api/pairing/*
│   │   └── settings.routes.ts      # GET/POST /api/settings
│   ├── services/
│   │   ├── ollama.service.ts       # Ollama HTTP client (chat, pull, delete)
│   │   └── conversation.service.ts # CRUD via @atlas/db
│   ├── plugins/
│   │   └── cors.plugin.ts          # CORS config (allow all origins — local only)
│   └── tsconfig.json
│
├── resources/
│   ├── icons/                      # App icons for all platforms
│   │   ├── icon.icns               # macOS
│   │   ├── icon.ico                # Windows
│   │   ├── icon.png                # Linux (multiple sizes)
│   │   └── tray-icon.png           # System tray (16x16)
│   ├── ollama/                     # Bundled Ollama binaries (Approach B only)
│   ├── entitlements.mac.plist      # macOS entitlements for Ollama subprocess
│   └── dmg-background.png          # macOS DMG installer background
│
├── electron-builder.yml            # Packaging config
├── next.config.mjs                 # Next.js config (static export, CSP, transpile)
├── package.json
├── tsconfig.json                   # Next.js renderer tsconfig
└── tailwind.config.ts
```

---

## Electron Main Process

### `electron/main.ts` — Application Entry Point

The main process orchestrates the entire desktop app lifecycle:

```typescript
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { startOllamaSidecar, stopOllamaSidecar } from './sidecar';
import { startFastifyServer, stopFastifyServer } from '../server';
import { registerChatIPC } from './ipc/chat.ipc';
import { registerModelsIPC } from './ipc/models.ipc';
import { registerSystemIPC } from './ipc/system.ipc';
import { setupTray } from './tray';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',   // macOS: custom title bar
    titleBarOverlay: {              // Windows: custom title bar overlay
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 36,
    },
    backgroundColor: '#0a0a0a',    // Dark bg to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,       // ALWAYS true — security
      nodeIntegration: false,       // ALWAYS false — security
      sandbox: false,               // Must be false for preload to work
    },
    show: false,                    // Don't show until ready-to-show
  });

  // Load Next.js dev server in dev, static build in prod
  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  // 1. Start Ollama sidecar first
  await startOllamaSidecar();

  // 2. Start Fastify API server
  await startFastifyServer({ port: 3001, host: '0.0.0.0' });

  // 3. Register all IPC handlers
  registerChatIPC();
  registerModelsIPC();
  registerSystemIPC();

  // 4. Create window
  await createWindow();

  // 5. Setup system tray
  if (mainWindow) setupTray(mainWindow);
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', cleanup);

async function cleanup() {
  await stopFastifyServer();
  await stopOllamaSidecar();
}
```

### Bootstrap sequence:

```
app.whenReady()
  → startOllamaSidecar()     // Spawn Ollama, wait for "Listening" or 3s timeout
  → startFastifyServer()     // Bind :3001 on 0.0.0.0
  → registerIPC()            // Register all typed IPC handlers
  → createWindow()           // Create BrowserWindow, load Next.js
  → setupTray()              // Create system tray with menu
```

### Window configuration details:

| Option | Value | Why |
|---|---|---|
| `titleBarStyle` | `'hiddenInset'` | macOS: native traffic lights, custom title area |
| `titleBarOverlay` | `{ color: '#0a0a0a', ... }` | Windows: overlay buttons on dark background |
| `backgroundColor` | `'#0a0a0a'` | Prevents white flash before Next.js loads |
| `contextIsolation` | `true` | Security: renderer can't access Node.js |
| `nodeIntegration` | `false` | Security: no `require()` in renderer |
| `sandbox` | `false` | Required for preload script to access `ipcRenderer` |
| `show` | `false` | Prevents blank window; show on `ready-to-show` |

### Electron TypeScript config (`electron/tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "../dist/electron",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["./**/*.ts"]
}
```

**Important:** No `"DOM"` lib — Electron main is pure Node.js.

---

## Ollama Sidecar Lifecycle

### `electron/sidecar.ts`

Ollama runs as a child process managed by the Electron main process:

```typescript
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let ollamaProcess: ChildProcess | null = null;

function getOllamaBinaryPath(): string {
  const platform = process.platform;
  const arch = process.arch;
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'ollama')
    : path.join(app.getAppPath(), '..', 'resources', 'ollama');

  const binaryName =
    platform === 'win32' ? 'ollama.exe'
    : platform === 'darwin' ? (arch === 'arm64' ? 'ollama-darwin-arm64' : 'ollama-darwin-amd64')
    : (arch === 'arm64' ? 'ollama-linux-arm64' : 'ollama-linux-amd64');

  return path.join(resourcesPath, binaryName);
}

export async function startOllamaSidecar(): Promise<void> {
  // In dev, assume Ollama is already running
  if (process.env.NODE_ENV === 'development') {
    console.log('[Dev] Assuming Ollama is running on localhost:11434');
    return;
  }

  const binaryPath = getOllamaBinaryPath();
  if (!fs.existsSync(binaryPath)) {
    throw new Error('Ollama binary missing. Please reinstall Atlas AI.');
  }

  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  return new Promise((resolve, reject) => {
    ollamaProcess = spawn(binaryPath, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: '127.0.0.1:11434',
        OLLAMA_ORIGINS: '*',
        OLLAMA_MODELS: getModelsDir(),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    ollamaProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      console.log('[Ollama]', line.trim());
      if (line.includes('Listening on') || line.includes('127.0.0.1:11434')) {
        resolve();
      }
    });

    ollamaProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      if (line.includes('level=ERROR') || line.includes('fatal')) {
        console.error('[Ollama ERROR]', line.trim());
      }
    });

    ollamaProcess.on('error', reject);
    setTimeout(resolve, 3000); // Fallback if already running
  });
}

export async function stopOllamaSidecar(): Promise<void> {
  if (!ollamaProcess) return;
  ollamaProcess.kill('SIGTERM');
  ollamaProcess = null;
}

export async function pingOllama(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getModelsDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || home, 'ollama', 'models');
  }
  return path.join(home, '.ollama', 'models');
}
```

### Model storage:

Models are stored in Ollama's default directory — never moved or copied:
- **macOS/Linux:** `~/.ollama/models`
- **Windows:** `%LOCALAPPDATA%\ollama\models`

Models survive app updates and reinstalls.

---

## IPC Preload Bridge

### `electron/preload.ts`

All renderer-to-main communication goes through a typed contextBridge:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

const VALID_SEND_CHANNELS = [
  'chat:send', 'models:pull', 'models:delete', 'system:getInfo'
] as const;

const VALID_RECEIVE_CHANNELS = [
  'models:pullProgress', 'system:ollamaStatus'
] as const;

type SendChannel = typeof VALID_SEND_CHANNELS[number];
type ReceiveChannel = typeof VALID_RECEIVE_CHANNELS[number];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: SendChannel, data?: unknown) => {
    if (!VALID_SEND_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, data);
  },
  on: (channel: ReceiveChannel, callback: (data: unknown) => void) => {
    if (!VALID_RECEIVE_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
```

### Type declaration for renderer:

```typescript
export type ElectronAPI = {
  invoke: (channel: SendChannel, data?: unknown) => Promise<unknown>;
  on: (channel: ReceiveChannel, callback: (data: unknown) => void) => () => void;
};

// In renderer: window.electronAPI.invoke('models:pull', 'llama3.2:3b')
```

### IPC Handlers:

**`electron/ipc/models.ipc.ts`:**
```typescript
import { ipcMain } from 'electron';

export function registerModelsIPC() {
  ipcMain.handle('models:list', async () => {
    const res = await fetch('http://localhost:11434/api/tags');
    const data = await res.json();
    return data.models;
  });

  ipcMain.handle('models:pull', async (event, modelName: string) => {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const progress = JSON.parse(line);
          event.sender.send('models:pullProgress', progress);
        } catch { /* skip malformed */ }
      }
    }
  });

  ipcMain.handle('models:delete', async (_event, modelName: string) => {
    const res = await fetch('http://localhost:11434/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });
    return res.ok;
  });
}
```

---

## Fastify API Server

### `server/index.ts` — Server Entry

```typescript
import Fastify from 'fastify';
import { chatRoutes } from './routes/chat.routes';
import { modelsRoutes } from './routes/models.routes';
import { healthRoutes } from './routes/health.routes';
import { pairingRoutes } from './routes/pairing.routes';
import { corsPlugin } from './plugins/cors.plugin';
import { networkInterfaces } from 'os';

const server = Fastify({
  logger: {
    level: 'info',
    transport: { target: 'pino-pretty', options: { colorize: true } },
  },
});

export async function startFastifyServer({ port = 3001, host = '0.0.0.0' }) {
  await server.register(corsPlugin);
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(chatRoutes, { prefix: '/api' });
  await server.register(modelsRoutes, { prefix: '/api' });
  await server.register(pairingRoutes, { prefix: '/api' });

  await server.listen({ port, host });

  const lanIP = getLanIP();
  console.log(`[Atlas Server] Listening on http://localhost:${port}`);
  if (lanIP) console.log(`[Atlas Server] LAN access: http://${lanIP}:${port}`);
  return server;
}

export async function stopFastifyServer() {
  await server.close();
}

export function getLanIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}
```

### CORS Plugin:

```typescript
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: true,  // All origins — all requests are local
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control'],
  });
});
```

---

## API Routes Reference

### Complete route map:

| Method | Path | Purpose | Response |
|---|---|---|---|
| `GET` | `/api/health` | Health check (mobile verifies connection) | `{ status, app, version, lanIP, timestamp }` |
| `GET` | `/api/health/ollama` | Ollama status check | `{ status: 'running' \| 'offline' }` |
| `POST` | `/api/chat` | Chat with streaming (SSE) | `text/event-stream` |
| `GET` | `/api/conversations` | List all conversations | `Conversation[]` |
| `GET` | `/api/conversations/:id` | Get conversation with messages | `ConversationWithMessages` |
| `POST` | `/api/conversations` | Create new conversation | `Conversation` |
| `DELETE` | `/api/conversations/:id` | Delete conversation | `{ success: true }` |
| `GET` | `/api/models` | List installed Ollama models | `OllamaModel[]` |
| `POST` | `/api/models/pull` | Pull model with SSE progress | `text/event-stream` |
| `DELETE` | `/api/models/:name` | Delete a model | `{ success: true }` |
| `GET` | `/api/pairing/token` | Generate QR pairing token | `PairingTokenResponse` |
| `POST` | `/api/pairing/verify` | Verify pairing token | `{ success, lanIP, port }` |
| `GET` | `/api/settings` | Get all settings | `Record<string, string>` |
| `GET` | `/api/settings/:key` | Get single setting | `{ key, value }` |
| `POST` | `/api/settings` | Update a setting | `{ success: true }` |

### Chat SSE streaming format:

```
POST /api/chat
Content-Type: application/json

{
  "conversationId": "abc123",
  "model": "llama3.2:3b",
  "messages": [{ "role": "user", "content": "Hello" }],
  "systemPrompt": "You are Atlas, a helpful AI assistant."
}

Response: text/event-stream

data: {"token":"Hello"}
data: {"token":" there"}
data: {"token":"!"}
data: {"done":true}
```

### Chat route implementation:

```typescript
export async function chatRoutes(fastify: FastifyInstance) {
  const ollama = new OllamaService();
  const conversations = new ConversationService();

  fastify.post<{ Body: ChatRequest }>('/chat', async (request, reply) => {
    const { messages, model, conversationId, systemPrompt } = request.body;

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders();

    const fullMessages: ChatMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages,
    ];

    let fullResponse = '';

    try {
      const stream = await ollama.chatStream({ model, messages: fullMessages });
      for await (const chunk of stream) {
        if (chunk.done) {
          if (conversationId) {
            await conversations.appendAssistantMessage(conversationId, fullResponse);
          }
          reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          break;
        }
        const token = chunk.message?.content ?? '';
        fullResponse += token;
        reply.raw.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    } finally {
      reply.raw.end();
    }
    return reply;
  });
}
```

### OllamaService:

```typescript
const OLLAMA_BASE = 'http://localhost:11434';

export class OllamaService {
  async listModels(): Promise<OllamaModel[]> { /* GET /api/tags */ }
  async *chatStream(params): AsyncGenerator<OllamaChatChunk> { /* POST /api/chat stream */ }
  async *pullModel(name: string): AsyncGenerator<PullProgress> { /* POST /api/pull stream */ }
  async deleteModel(name: string): Promise<void> { /* DELETE /api/delete */ }
  async generateTitle(model: string, userMessage: string): Promise<string> { /* POST /api/generate */ }
}
```

### Pairing routes (for mobile QR code):

```typescript
// In-memory tokens, cleared on restart, expire after 5 minutes
const activePairingTokens = new Map<string, { createdAt: number }>();

// GET /api/pairing/token → { token, lanIP, port, connectionString }
// connectionString format: atlas://connect?ip=192.168.1.100&port=3001&token=abc123

// POST /api/pairing/verify { token } → { success, lanIP, port }
// Token is consumed (single-use)
```

---

## SQLite Database

### Location by platform:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Atlas AI/atlas.db` |
| Windows | `%APPDATA%\Atlas AI\atlas.db` |
| Linux | `~/.config/Atlas AI/atlas.db` |

### Schema:

```sql
CREATE TABLE conversations (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT 'New Conversation',
  model         TEXT NOT NULL,
  system_prompt TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  created_at      TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);
```

### Default settings:

| Key | Default | Purpose |
|---|---|---|
| `default_model` | `llama3.2:3b` | Model for new conversations |
| `theme` | `dark` | UI theme (only dark supported) |
| `font_size` | `14` | Base font size |
| `stream_responses` | `true` | Enable SSE streaming |
| `show_token_count` | `false` | Show token count in messages |
| `mobile_api_enabled` | `true` | Allow mobile connections |
| `system_prompt` | `""` | Default system prompt |
| `setup_complete` | `false` | First-launch wizard completed |

### Database key decisions:

- **Synchronous API** — better-sqlite3 is sync by design, no async/await needed
- **WAL mode** — enabled for better concurrent read performance
- **Foreign keys ON** — cascade deletes (delete conversation = delete all messages)
- **Prepared statements** — always use prepared statements, never raw string interpolation
- **DB singleton** — initialized once in Electron main, accessed via `getDb()`
- **Migrations** — run on app startup, idempotent (`CREATE TABLE IF NOT EXISTS`)

### Context window management:

```typescript
const MAX_CONTEXT_MESSAGES = 20; // ~4000 tokens typical

// Get last 20 messages for context (not all messages in conversation)
async function buildContextMessages(conversationId: string): Promise<ChatMessage[]> {
  const db = getDb();
  const messages = db.messages.getLastN(conversationId, MAX_CONTEXT_MESSAGES);
  return messages.map(m => ({ role: m.role, content: m.content }));
}
```

---

## Next.js Renderer (Desktop UI)

### Design language:

- **Dark mode only** — intentional for a privacy app
- Base background: `bg-[#0a0a0a]`
- Sidebar: `bg-[#111111]`
- Borders: `border-white/10`
- Text: `text-white`, `text-white/60`, `text-white/40`, `text-white/30`
- Accent: `bg-indigo-600` (buttons, user bubbles)
- User message bubbles: right-aligned, `bg-indigo-600`
- Assistant message bubbles: left-aligned, `bg-white/5`
- Font: Inter (from Google Fonts)
- Code: monospace with syntax highlighting via `highlight.js/styles/github-dark.css`

### Root layout:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

### Next.js config for Electron:

```javascript
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: { unoptimized: true },
  poweredByHeader: false,
  transpilePackages: ['@atlas/shared', '@atlas/db'],
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' http://localhost:3001 http://localhost:11434",
          "img-src 'self' data: blob:",
        ].join('; '),
      }],
    }];
  },
};
```

**Key:** In production, `output: 'export'` creates a static build in `out/` that Electron loads via `loadFile()`. No Next.js server in production.

---

## UI Components

### AppShell — Layout wrapper

```
┌─────────────────────────────────────────────┐
│                TitleBar                       │
├──────────┬──────────────────────────────────┤
│          │                                    │
│ Sidebar  │          Main Content              │
│ (264px)  │     (children / chat page)        │
│          │                                    │
│          │                                    │
│          │                                    │
└──────────┴──────────────────────────────────┘
```

- Shows `SetupWizard` if `isSetupComplete` is false
- Otherwise shows sidebar + main content

### Sidebar — Conversation navigation

- "New chat" button at top
- Conversation list (title + relative time)
- Active conversation highlighted with `bg-white/10`
- Bottom nav: Models, Settings links
- Width: `w-64` (256px)

### ChatWindow — Message display

- Scrollable message list with auto-scroll on new content
- Empty state: Atlas AI logo + "Your private, offline assistant"
- Messages render in `max-w-3xl` centered container
- Streaming response shows blinking cursor
- Fixed input area at bottom with border separator

### MessageBubble — Individual messages

- **User:** right-aligned, `bg-indigo-600`, plain text, rounded with `rounded-tr-sm`
- **Assistant:** left-aligned, `bg-white/5`, markdown rendered via react-markdown, rounded with `rounded-tl-sm`
- Both show relative timestamp at bottom
- Max width: `max-w-[85%]`

### MessageInput — Chat input

- Auto-resizing textarea (max 200px height)
- Enter to send, Shift+Enter for newline
- Send button: indigo when text present, disabled when empty
- Stop button (red): shown during streaming

### SetupWizard — First-launch experience

Four steps: `welcome` → `pick-model` → `downloading` → `done`

1. **Welcome:** Logo, title, "Get Started" button
2. **Pick model:** Radio selection from top 5 recommended models with tier badges (fast/balanced/capable), size, RAM requirements
3. **Downloading:** Progress bar with percentage and status
4. **Done:** Checkmark, auto-reload to main app

---

## Hooks

### `useStreamingResponse(conversationId)`

Handles the SSE streaming lifecycle:

```typescript
const { sendMessage } = useStreamingResponse(conversationId);

// sendMessage flow:
// 1. addUserMessage() — optimistic UI update
// 2. startStreaming() — show cursor
// 3. fetch POST /api/chat with ReadableStream
// 4. Parse SSE lines: data: {"token": "..."} and data: {"done": true}
// 5. appendStreamToken() on each token
// 6. finishStreaming() when done — creates assistant message in store
```

### `useOllamaStatus()`

Polls Ollama health every 10 seconds:

```typescript
const { isRunning, isSetupComplete, isLoading } = useOllamaStatus();

// Checks:
// - GET /api/health/ollama → is Ollama running?
// - GET /api/settings/setup_complete → has first model been downloaded?
```

---

## Zustand State Management

### `chat.store.ts`

```typescript
interface ChatStore {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  loadConversations: () => Promise<void>;    // GET /api/conversations
  loadConversation: (id: string) => Promise<void>;  // GET /api/conversations/:id
  createConversation: (model?: string) => Promise<string>;  // POST /api/conversations
  addUserMessage: (content: string) => void;  // Optimistic local add
  startStreaming: () => void;
  appendStreamToken: (token: string) => void;
  finishStreaming: (conversationId: string) => void;
}
```

### `models.store.ts`

```typescript
interface ModelsStore {
  installedModels: OllamaModel[];
  activeModel: string;           // Default: 'llama3.2:3b'
  pullingModel: string | null;
  pullProgress: PullProgress | null;

  loadModels: () => Promise<void>;
  pullModel: (name: string) => Promise<void>;  // SSE progress stream
  deleteModel: (name: string) => Promise<void>;
  setActiveModel: (name: string) => void;
}
```

### `settings.store.ts`

```typescript
interface SettingsStore {
  settings: Settings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
}
```

---

## Streaming (SSE) Implementation

### Architecture:

```
User types message
  → Next.js UI (fetch POST /api/chat)
  → Fastify route (proxy to Ollama)
  → Ollama (POST /api/chat with stream: true)
  → Ollama streams ndjson chunks back
  → Fastify converts to SSE (data: {...}\n\n)
  → Next.js reads with ReadableStream reader
  → Token by token appended to Zustand store
  → React re-renders streaming bubble
```

### SSE format (Fastify → Client):

```
data: {"token":"Hello"}\n\n
data: {"token":" there"}\n\n
data: {"token":"!"}\n\n
data: {"done":true}\n\n
```

### Error event:

```
data: {"error":"Ollama is not running"}\n\n
```

### Client-side parsing:

```typescript
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value, { stream: true });
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    if (event.token) appendStreamToken(event.token);
    if (event.done) finishStreaming(conversationId);
    if (event.error) throw new Error(event.error);
  }
}
```

### Stream timeout:

```typescript
const STREAM_TIMEOUT_MS = 30_000;
const response = await fetch(url, {
  signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
});
```

---

## Model Management

### Recommended models (curated list):

| Model | Display Name | Size | RAM | Tier | Strengths |
|---|---|---|---|---|---|
| `llama3.2:3b` | Llama 3.2 3B | 2.0 GB | 4 GB | balanced | General chat, Writing, Reasoning, Code |
| `llama3.2:1b` | Llama 3.2 1B | 0.8 GB | 2 GB | fast | Quick responses, Low-resource |
| `gemma2:2b` | Gemma 2 2B | 1.6 GB | 4 GB | fast | Instruction following, Writing |
| `phi3:mini` | Phi-3 Mini | 2.3 GB | 4 GB | fast | Reasoning, Code, Math |
| `qwen2.5:3b` | Qwen 2.5 3B | 2.0 GB | 4 GB | balanced | Multilingual, Code, Math |
| `llama3.1:8b` | Llama 3.1 8B | 4.7 GB | 8 GB | capable | Complex reasoning, Long context |
| `mistral:7b` | Mistral 7B | 4.1 GB | 8 GB | capable | Code generation, Technical writing |
| `deepseek-coder:6.7b` | DeepSeek Coder | 3.8 GB | 8 GB | capable | Code generation, Debugging |

### Model operations flow:

```
List models:   GET /api/models → Ollama GET /api/tags
Pull model:    POST /api/models/pull → Ollama POST /api/pull (streamed)
Delete model:  DELETE /api/models/:name → Ollama DELETE /api/delete
```

### Expected generation speeds:

| Hardware | Speed (3B model) |
|---|---|
| M1/M2 Mac (Metal) | 15-40 tokens/sec |
| Modern CPU (no GPU) | 2-8 tokens/sec |
| NVIDIA GPU | 30-80 tokens/sec |

---

## Settings System

### Settings page sections:

1. **Default model** — ModelSelector dropdown
2. **Mobile app** — QR code generation for pairing
3. **About** — Version info, privacy statement

### QR code pairing flow:

1. Desktop generates token: `GET /api/pairing/token`
2. Returns `connectionString`: `atlas://connect?ip=192.168.1.100&port=3001&token=abc123`
3. QR code rendered from connectionString
4. Mobile scans → parses → `POST /api/pairing/verify` with token
5. Token consumed (single-use, expires in 5 minutes)

---

## System Tray

```typescript
// Menu items:
// - "Open Atlas AI" → show/focus window
// - Separator
// - "Ollama Status" (disabled label, shows running/offline)
// - Separator
// - "Quit" → app.quit()

// Click behavior: toggle window visibility
tray.on('click', () => {
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
});
```

---

## Shared Package (`@atlas/shared`)

Zero runtime dependencies. Exports:

### Types (`@atlas/shared/types`):

- `MessageRole`, `ChatMessage`, `Message`, `Conversation`, `ConversationWithMessages`, `StreamEvent`
- `OllamaModel`, `PullProgress`, `OllamaChatChunk`, `RecommendedModel`
- `ChatRequest`, `ChatStreamEvent`, `HealthResponse`, `PairingTokenResponse`, `ApiError`

### Constants (`@atlas/shared/constants`):

- `RECOMMENDED_MODELS` — curated model list
- `DEFAULT_MODEL` — `'llama3.2:3b'`
- `DEFAULT_SYSTEM_PROMPT`, `CODE_SYSTEM_PROMPT`
- `API_BASE_URL`, `OLLAMA_BASE_URL`, `API_ROUTES`
- `DEFAULT_PORT` (3001), `OLLAMA_PORT` (11434)
- `STREAM_TIMEOUT_MS` (30000), `MAX_CONTEXT_MESSAGES` (20)

### Utilities (`@atlas/shared/utils`):

- `formatBytes(bytes)` — e.g., `"2.0 GB"`
- `formatPullProgress(completed, total)` — percentage
- `formatRelativeTime(isoString)` — e.g., `"2h ago"`
- `truncate(str, maxLength)` — with ellipsis
- `generateId()` — simple ID generator

---

## Database Package (`@atlas/db`)

### Package exports:

```typescript
import { initDb, getDb } from '@atlas/db';

initDb();  // Called once in Electron main on startup
const db = getDb();

db.conversations.findMany();
db.conversations.findById(id);
db.conversations.create({ id, title, model, createdAt, updatedAt });
db.conversations.update(id, { title, updatedAt });
db.conversations.delete(id);
db.conversations.count();

db.messages.findByConversationId(conversationId);
db.messages.create({ id, conversationId, role, content, createdAt });
db.messages.deleteByConversationId(conversationId);
db.messages.getLastN(conversationId, n);

db.settings.get(key);
db.settings.set(key, value);
db.settings.getAll();
db.settings.getDefaultModel();
db.settings.setDefaultModel(model);
db.settings.isSetupComplete();
db.settings.markSetupComplete();
```

---

## Configuration Files

### `next.config.mjs`

- `output: 'export'` in production (static build for Electron)
- `images: { unoptimized: true }` (no image optimization server)
- `transpilePackages: ['@atlas/shared', '@atlas/db']`
- CSP headers allowing `localhost:3001` and `localhost:11434`

### `electron-builder.yml`

- App ID: `com.atlasai.desktop`
- macOS: DMG + ZIP (x64 + arm64), hardened runtime, entitlements
- Windows: NSIS installer (x64), optional code signing
- Linux: AppImage + DEB
- Publish: GitHub Releases

### `tsconfig.json` (renderer)

- Extends Next.js defaults
- Strict mode
- Path alias: `@/*` → `./src/*`
- Includes DOM lib

### `electron/tsconfig.json` (main)

- Target: ES2022
- Module: CommonJS
- No DOM lib
- Strict mode

---

## Build & Distribution

### Two approaches for Ollama:

**Approach A: Download on First Launch (Recommended)**
- Installer size: ~80MB
- On first launch, downloads Ollama (~70MB) for the platform
- Uses `electron/installer.ts` with platform-specific download URLs
- Checks `ollama --version` and common install locations first

**Approach B: Bundle Ollama Binary**
- Installer size: ~150MB
- Uses `extraResources` in electron-builder.yml
- Fully self-contained, no internet needed after install
- Build script: `scripts/download-ollama.sh`

### Production build pipeline:

```bash
# 1. Build shared packages
pnpm build --filter=@atlas/shared
pnpm build --filter=@atlas/db

# 2. Build Next.js static export
cd apps/desktop && pnpm build:next  # → out/

# 3. Compile Electron TypeScript
pnpm build:electron  # → dist/electron/

# 4. Package
pnpm package  # electron-builder
```

### Output:

| Platform | Format | Size |
|---|---|---|
| macOS | `.dmg` (x64 + arm64) | ~80-150MB |
| Windows | NSIS `.exe` installer | ~80-150MB |
| Linux | `.AppImage` + `.deb` | ~80-150MB |

### macOS entitlements (required for Ollama subprocess):

- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.network.client`
- `com.apple.security.network.server`
- `com.apple.security.cs.allow-dyld-environment-variables`

---

## Development Workflow

### Starting development:

```bash
# Terminal 1: Start Ollama (dev mode — not bundled)
ollama serve

# Terminal 2: Start desktop app
cd apps/desktop
pnpm dev
# Runs: next dev (port 3000) + wait-on + electron .
```

### What happens on `pnpm dev`:

1. Next.js dev server starts on port 3000
2. `wait-on` waits for http://localhost:3000 to be ready
3. Electron launches, loads `http://localhost:3000`
4. Fastify starts on port 3001 (spawned by Electron main)
5. Ollama is assumed to be running (dev skips sidecar)

### Testing API manually:

```bash
# Health check
curl http://localhost:3001/api/health

# List models
curl http://localhost:3001/api/models

# Chat (streaming)
curl -N -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello"}]}'

# Create conversation
curl -X POST http://localhost:3001/api/conversations \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3.2:3b"}'
```

---

## Environment Variables

Desktop `.env.local` (never committed):

```env
OLLAMA_HOST=http://localhost:11434
LOCAL_API_PORT=3001
NEXT_PUBLIC_LOCAL_API=http://localhost:3001
```

**No secrets. No API keys. Everything is local.**

---

## Port Reference

| Service | Port | Binding | Who Uses It |
|---|---|---|---|
| Next.js dev server | 3000 | localhost | Electron renderer (dev only) |
| Fastify API server | 3001 | 0.0.0.0 | Next.js UI + Mobile app |
| Ollama | 11434 | localhost | Fastify server only |

---

## Security Model

### Renderer isolation:

- `contextIsolation: true` — renderer can't access Node.js globals
- `nodeIntegration: false` — no `require()` in renderer
- All Node.js access through typed `contextBridge` preload
- Only allowlisted IPC channels can be invoked

### Network security:

- Fastify on `0.0.0.0:3001` — accessible from LAN (for mobile)
- Ollama on `127.0.0.1:11434` — only accessible locally
- CORS allows all origins (all traffic is local anyway)
- No HTTPS needed (local network only)
- Pairing tokens are single-use, expire in 5 minutes

### CSP (Content Security Policy):

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
connect-src 'self' http://localhost:3001 http://localhost:11434;
img-src 'self' data: blob:;
```

### Data security:

- All data in local SQLite — never leaves device
- No telemetry, no analytics, no crash reporting
- No accounts, no authentication (except LAN pairing tokens)
- Models stored in `~/.ollama/models` — Ollama's standard location

---

## Performance Considerations

### SQLite:

- WAL mode enabled for concurrent reads
- Indexes on `messages.conversation_id` and `conversations.updated_at`
- For 1000+ message conversations, use paginated queries
- All queries use prepared statements

### Electron:

- `backgroundThrottling: false` keeps renderer responsive
- Static export eliminates Next.js server overhead in production
- Heavy markdown rendering: react-markdown is acceptable, avoid larger libs

### Ollama:

- Model uses most of the RAM — this is expected and unavoidable
- Reduce `num_ctx` to 2048 for low-RAM machines (default 4096)
- Smaller/more quantized models for older hardware
- Context window limited to 20 messages by default

### Bundle size:

```bash
npx @next/bundle-analyzer  # Analyze Next.js client bundle
```

Avoid: lodash (use native), moment (use native Date), large animation libs.

---

## Troubleshooting

### Ollama not starting:

- **Dev:** Must run `ollama serve` manually
- **Prod:** Check binary exists in `resources/ollama/`, correct platform/arch, executable permissions

### Port 3001 in use:

```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### White flash on startup:

- Set `backgroundColor: '#0a0a0a'` in BrowserWindow
- Use `show: false` + `ready-to-show` event

### better-sqlite3 native module errors:

```bash
# Rebuild for Electron's Node.js version
pnpm rebuild  # or: electron-rebuild -f -w better-sqlite3
```

### "@atlas/shared" not found:

```bash
pnpm build --filter=@atlas/shared
pnpm build --filter=@atlas/db
```

### Next.js API routes 404 in production:

Expected — static export doesn't include API routes. All API calls go to Fastify on port 3001.

### Electron TypeScript errors:

Make sure `electron/tsconfig.json` uses `"module": "CommonJS"` and no DOM lib.

### Out of memory:

Reduce model context: `options: { num_ctx: 2048 }` in Ollama chat request.

### Firewall blocking mobile connections:

- macOS: System Settings → Network → Firewall → Allow Atlas AI
- Windows: Windows Defender Firewall → Allow an app → Atlas AI.exe

---

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React component | `PascalCase.tsx` | `ChatWindow.tsx` |
| Hook | `camelCase.ts` | `useStreamingResponse.ts` |
| Store | `camelCase.ts` | `chat.store.ts` |
| Utility | `camelCase.ts` | `format.ts` |
| Fastify route | `[resource].routes.ts` | `chat.routes.ts` |
| Fastify service | `[resource].service.ts` | `ollama.service.ts` |
| DB query | `[resource].queries.ts` | `conversations.queries.ts` |
| Type file | `[resource].types.ts` | `chat.types.ts` |
| IPC handler | `[resource].ipc.ts` | `models.ipc.ts` |
| Constants | `[resource].constants.ts` | `models.constants.ts` |
| Next.js page | `page.tsx` | `app/chat/[id]/page.tsx` |

---

## Dependency Policy

### Allowed:

- UI libraries that work offline (Radix UI, Lucide icons, react-markdown)
- Build tools (types packages, linters, electron-builder)
- SQLite tooling (better-sqlite3)
- shadcn/ui components

### Not allowed:

- Any package that makes external network requests at runtime
- Any analytics, logging, or error tracking service
- Any package requiring an API key
- No OpenAI, no Anthropic, no cloud AI SDKs
- No Firebase, no Supabase, no cloud databases
- No Sentry, no Mixpanel, no PostHog

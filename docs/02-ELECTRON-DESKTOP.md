# Atlas AI — Electron Desktop App

## Architecture

The desktop app has three concurrent processes:
1. **Electron Main** — Node.js process. Owns: Ollama sidecar lifecycle, SQLite, IPC, system tray, window management.
2. **Electron Renderer** — Chromium running Next.js. Owns: all UI, chat state, model management UI.
3. **Fastify Server** — Node.js process (spawned by Main). Owns: HTTP/SSE API for both the renderer and mobile clients.

These three communicate as follows:
- Renderer ↔ Main: Electron IPC (typed, via preload bridge)
- Renderer → Fastify: HTTP fetch to `localhost:3001`
- Mobile → Fastify: HTTP fetch to `[LAN-IP]:3001`
- Main → Ollama: HTTP to `localhost:11434` (Ollama's default port)

---

## `electron/main.ts` — Full Implementation Pattern

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
    titleBarOverlay: {              // Windows: custom title bar
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 36,
    },
    backgroundColor: '#0a0a0a',    // Dark bg to prevent white flash on load
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,       // ALWAYS true - security
      nodeIntegration: false,       // ALWAYS false - security
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
  // On macOS keep app running in tray even with no windows
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

---

## `electron/sidecar.ts` — Ollama Lifecycle

```typescript
import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let ollamaProcess: ChildProcess | null = null;

// Where the bundled Ollama binary lives inside the packaged app
function getOllamaBinaryPath(): string {
  const platform = process.platform;
  const arch = process.arch;

  // In production: binary is in app.getPath('exe')/../resources/ollama/
  // In dev: binary is in resources/ at repo root
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
  const binaryPath = getOllamaBinaryPath();

  if (!fs.existsSync(binaryPath)) {
    console.error(`Ollama binary not found at: ${binaryPath}`);
    throw new Error('Ollama binary missing. Please reinstall Atlas AI.');
  }

  // Make sure it's executable (macOS/Linux)
  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  return new Promise((resolve, reject) => {
    ollamaProcess = spawn(binaryPath, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: '127.0.0.1:11434',
        OLLAMA_ORIGINS: '*',          // Allow our Fastify to call it
        OLLAMA_MODELS: getModelsDir(), // Where models are stored
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    ollamaProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      console.log('[Ollama]', line.trim());
      // Resolve once Ollama says it's listening
      if (line.includes('Listening on') || line.includes('127.0.0.1:11434')) {
        resolve();
      }
    });

    ollamaProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      // Ollama logs INFO to stderr — filter for actual errors
      if (line.includes('level=ERROR') || line.includes('fatal')) {
        console.error('[Ollama ERROR]', line.trim());
      }
    });

    ollamaProcess.on('error', (err) => {
      console.error('Failed to start Ollama:', err);
      reject(err);
    });

    // Fallback: assume running after 3s if no "Listening" message seen
    // (happens if Ollama was already running)
    setTimeout(resolve, 3000);
  });
}

export async function stopOllamaSidecar(): Promise<void> {
  if (!ollamaProcess) return;
  ollamaProcess.kill('SIGTERM');
  ollamaProcess = null;
}

function getModelsDir(): string {
  // Use Ollama's default models directory
  // Respects user's existing model downloads
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || home, 'ollama', 'models');
  }
  return path.join(home, '.ollama', 'models');
}

// Check if Ollama is responsive
export async function pingOllama(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
```

---

## `electron/preload.ts` — IPC Bridge

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// All channels the renderer is allowed to use — typed for safety
const VALID_SEND_CHANNELS = ['chat:send', 'models:pull', 'models:delete', 'system:getInfo'] as const;
const VALID_RECEIVE_CHANNELS = ['models:pullProgress', 'system:ollamaStatus'] as const;

type SendChannel = typeof VALID_SEND_CHANNELS[number];
type ReceiveChannel = typeof VALID_RECEIVE_CHANNELS[number];

contextBridge.exposeInMainWorld('electronAPI', {
  // Send to main, await response
  invoke: (channel: SendChannel, data?: unknown) => {
    if (!VALID_SEND_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, data);
  },

  // Listen to events from main
  on: (channel: ReceiveChannel, callback: (data: unknown) => void) => {
    if (!VALID_RECEIVE_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler); // Return cleanup fn
  },
});

// TypeScript declaration for renderer
export type ElectronAPI = {
  invoke: (channel: SendChannel, data?: unknown) => Promise<unknown>;
  on: (channel: ReceiveChannel, callback: (data: unknown) => void) => () => void;
};
```

---

## `electron/ipc/models.ipc.ts` — Model Management IPC

```typescript
import { ipcMain } from 'electron';

export function registerModelsIPC() {
  // List installed models
  ipcMain.handle('models:list', async () => {
    const res = await fetch('http://localhost:11434/api/tags');
    const data = await res.json();
    return data.models;
  });

  // Pull (download) a model — streams progress back to renderer
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
          // Send progress to renderer via webContents
          event.sender.send('models:pullProgress', progress);
        } catch {
          // Skip malformed JSON
        }
      }
    }
  });

  // Delete a model
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

## `electron-builder.yml` — Packaging Config

```yaml
appId: com.atlasai.app
productName: Atlas AI
copyright: Copyright © 2024

directories:
  output: release
  buildResources: resources

files:
  - "**/*"
  - "!electron/src/**/*"
  - "!**/*.ts"
  - "!**/*.map"

# Extra resources = bundled Ollama binaries
extraResources:
  - from: resources/ollama/
    to: ollama/
    filter:
      - "**/*"

# macOS
mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: resources/icons/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist
  # Ollama binary needs this entitlement to run
  provisioningProfile: ~

# Windows
win:
  target: nsis
  icon: resources/icons/icon.ico
  signingHashAlgorithms: [sha256]

# Linux
linux:
  target: AppImage
  category: Utility
  icon: resources/icons/

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

# Build hooks
afterSign: scripts/notarize.js   # macOS notarization (prod only)
```

---

## `electron/tray.ts` — System Tray

```typescript
import { BrowserWindow, Menu, Tray, nativeImage, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, '../resources/icons/tray-icon.png');
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Atlas AI',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Ollama Status',
      enabled: false,
      id: 'ollama-status',
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('Atlas AI — Local AI Assistant');

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}
```

---

## `next.config.mjs` — Next.js Config for Electron

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for production (Electron loads from filesystem)
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,

  // Images: disable optimization (no server in static export)
  images: {
    unoptimized: true,
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Transpile shared packages
  transpilePackages: ['@atlas/shared', '@atlas/db'],

  // Allow Electron's file:// protocol in CSP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' http://localhost:3001 http://localhost:11434",
              "img-src 'self' data: blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Development Startup Flow

When running `pnpm dev:desktop`, three processes start concurrently:

1. **Next.js dev server** on port 3000 (`next dev`)
2. **Electron** (loads `http://localhost:3000`)
3. **Fastify** (spawned by Electron main on port 3001)

Ollama must already be installed separately during development. In dev mode, the sidecar check skips the bundled binary and assumes Ollama is on PATH.

```typescript
// sidecar.ts dev mode check
async function startOllamaSidecar() {
  if (process.env.NODE_ENV === 'development') {
    // In dev, assume Ollama is already running or start via PATH
    console.log('[Dev] Assuming Ollama is running on localhost:11434');
    return;
  }
  // Production: use bundled binary
  // ...
}
```
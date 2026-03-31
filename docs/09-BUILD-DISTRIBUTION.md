# Atlas AI — Build & Distribution

## Overview

The desktop app is distributed as a native installer (DMG for macOS, NSIS installer for Windows, AppImage for Linux). The Ollama binary is **not bundled** in the app package — it's downloaded during first setup to keep the installer size manageable and to avoid platform-specific binary signing issues.

**Alternative approach (advanced):** Bundle Ollama binary via `extraResources` in electron-builder. This makes the app fully self-contained but increases installer size by ~70MB. Instructions for both approaches are below.

---

## Approach A: Download Ollama on First Launch (Recommended)

Installer size: ~80MB  
Setup time: ~30 seconds (downloads Ollama ~70MB)

### How it works

On first launch, before showing any UI:
1. Check if Ollama is already installed (`ollama` on PATH or `~/.ollama/bin/ollama` exists)
2. If not, download the appropriate binary for the platform
3. Install Ollama (run the installer silently on Windows/macOS)
4. Start Ollama service
5. Continue to setup wizard

### `electron/installer.ts` — Ollama Downloader

```typescript
import { app, BrowserWindow } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const OLLAMA_RELEASES = {
  'darwin-arm64': 'https://github.com/ollama/ollama/releases/latest/download/Ollama-darwin.zip',
  'darwin-x64':   'https://github.com/ollama/ollama/releases/latest/download/Ollama-darwin.zip',
  'win32-x64':    'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe',
  'linux-x64':    'https://github.com/ollama/ollama/releases/latest/download/ollama-linux-amd64',
  'linux-arm64':  'https://github.com/ollama/ollama/releases/latest/download/ollama-linux-arm64',
};

export async function isOllamaInstalled(): Promise<boolean> {
  // Check if ollama command exists
  try {
    await execAsync('ollama --version');
    return true;
  } catch {
    // Check common install locations
    const locations = [
      '/usr/local/bin/ollama',
      `${process.env.HOME}/.ollama/bin/ollama`,
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Ollama\\ollama.exe',
      '/Applications/Ollama.app/Contents/MacOS/ollama',
    ];
    return locations.some((loc) => fs.existsSync(loc));
  }
}

export async function downloadAndInstallOllama(
  onProgress: (pct: number, status: string) => void
): Promise<void> {
  const platform = `${process.platform}-${process.arch}`;
  const url = OLLAMA_RELEASES[platform as keyof typeof OLLAMA_RELEASES];

  if (!url) {
    throw new Error(`No Ollama binary available for ${platform}`);
  }

  const tmpDir = app.getPath('temp');
  const ext = process.platform === 'win32' ? '.exe' : process.platform === 'darwin' ? '.zip' : '';
  const tmpFile = path.join(tmpDir, `ollama-installer${ext}`);

  // Download
  onProgress(0, 'Downloading Ollama...');
  await downloadFile(url, tmpFile, (pct) => {
    onProgress(pct * 0.8, `Downloading... ${pct}%`);
  });

  // Install
  onProgress(80, 'Installing Ollama...');
  if (process.platform === 'win32') {
    await execAsync(`"${tmpFile}" /SILENT`);
  } else if (process.platform === 'darwin') {
    await execAsync(`cd "${tmpDir}" && unzip -o ollama-installer.zip`);
    await execAsync(`mv "${tmpDir}/Ollama.app" /Applications/`);
  } else {
    fs.chmodSync(tmpFile, 0o755);
    await execAsync(`sudo mv "${tmpFile}" /usr/local/bin/ollama`);
  }

  onProgress(100, 'Done!');
  fs.unlinkSync(tmpFile); // Cleanup
}

function downloadFile(
  url: string,
  dest: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Follow redirects
    const followRedirect = (url: string) => {
      https.get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          followRedirect(res.headers.location!);
          return;
        }

        const total = parseInt(res.headers['content-length'] ?? '0');
        let received = 0;
        const file = fs.createWriteStream(dest);

        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (total > 0) onProgress(Math.round((received / total) * 100));
        });

        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      }).on('error', reject);
    };

    followRedirect(url);
  });
}
```

---

## Approach B: Bundle Ollama Binary (Self-Contained)

Installer size: ~150MB  
Setup time: immediate (no downloads)

### Script to download binaries at build time

Create `scripts/download-ollama.sh`:

```bash
#!/bin/bash
# Run before electron-builder: pnpm download-ollama

OLLAMA_VERSION="0.3.14"  # Pin to known good version
RESOURCES_DIR="apps/desktop/resources/ollama"

mkdir -p "$RESOURCES_DIR"

# macOS ARM64
curl -L "https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-darwin" \
  -o "$RESOURCES_DIR/ollama-darwin-arm64"

# macOS x64 (same binary, universal)  
cp "$RESOURCES_DIR/ollama-darwin-arm64" "$RESOURCES_DIR/ollama-darwin-amd64"

# Linux x64
curl -L "https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-linux-amd64" \
  -o "$RESOURCES_DIR/ollama-linux-amd64"

# Linux ARM64
curl -L "https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-linux-arm64" \
  -o "$RESOURCES_DIR/ollama-linux-arm64"

# Windows
curl -L "https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-windows-amd64.exe" \
  -o "$RESOURCES_DIR/ollama.exe"

chmod +x "$RESOURCES_DIR"/ollama-*

echo "✓ Ollama binaries downloaded to $RESOURCES_DIR"
```

Add to `package.json`:
```json
{
  "scripts": {
    "download-ollama": "bash scripts/download-ollama.sh",
    "prebuild": "pnpm download-ollama"
  }
}
```

---

## `electron-builder.yml` — Complete Config

```yaml
appId: com.atlasai.desktop
productName: Atlas AI
copyright: Copyright © 2024 Atlas AI

directories:
  output: release/${version}
  buildResources: resources

# Files to include in the package
files:
  - dist/**/*          # Compiled Electron main + preload
  - out/**/*           # Next.js static export
  - server/dist/**/*   # Compiled Fastify server
  - package.json

# APPROACH B ONLY: Bundled Ollama binaries
# extraResources:
#   - from: resources/ollama/
#     to: ollama/

# macOS
mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  icon: resources/icons/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist

dmg:
  title: Atlas AI
  background: resources/dmg-background.png
  window:
    width: 540
    height: 380
  contents:
    - x: 130
      y: 200
      type: file
    - x: 410
      y: 200
      type: link
      path: /Applications

# Windows
win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icons/icon.ico
  # Sign with certificate for production
  # certificateFile: cert.p12
  # certificatePassword: ${CERT_PASSWORD}

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  installerIcon: resources/icons/icon.ico
  uninstallerIcon: resources/icons/icon.ico

# Linux
linux:
  target:
    - AppImage
    - deb
  category: Utility
  icon: resources/icons/

publish:
  provider: github
  owner: your-github-username
  repo: atlas-ai
  private: false
```

---

## `resources/entitlements.mac.plist` — macOS Entitlements

Ollama needs specific entitlements to run as a subprocess:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
  <!-- Allow spawning subprocess (Ollama) -->
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
</dict>
</plist>
```

---

## Build Pipeline

### Development

```bash
# Terminal 1: Start Ollama manually in dev
ollama serve

# Terminal 2: Start everything else
cd apps/desktop
pnpm dev
# This runs: next dev + electron (loads localhost:3000)
```

### Production Build

```bash
# 1. Build shared packages first
pnpm build --filter=@atlas/shared
pnpm build --filter=@atlas/db

# 2. Build Next.js static export
cd apps/desktop
pnpm build:next     # next build (outputs to out/)

# 3. Compile Electron TypeScript
pnpm build:electron # tsc for electron/ and server/

# 4. Package with electron-builder
pnpm package        # electron-builder --config electron-builder.yml

# Output: release/1.0.0/Atlas AI-1.0.0.dmg (macOS)
#         release/1.0.0/Atlas AI Setup 1.0.0.exe (Windows)
#         release/1.0.0/Atlas AI-1.0.0.AppImage (Linux)
```

### `apps/desktop/package.json` build scripts

```json
{
  "scripts": {
    "dev": "concurrently \"next dev -p 3000\" \"wait-on http://localhost:3000 && electron .\"",
    "build:next": "next build",
    "build:electron": "tsc -p electron/tsconfig.json && tsc -p server/tsconfig.json",
    "build": "pnpm build:next && pnpm build:electron",
    "package": "electron-builder",
    "package:mac": "electron-builder --mac",
    "package:win": "electron-builder --win",
    "package:linux": "electron-builder --linux"
  }
}
```

---

## Auto-Update (Future)

For auto-updates without app stores, use `electron-updater`:

```typescript
// In electron/main.ts — production only
import { autoUpdater } from 'electron-updater';

if (app.isPackaged) {
  autoUpdater.checkForUpdatesAndNotify();
  // Updates download from GitHub Releases automatically
}
```

Updates are purely the app binary — models are not affected by updates since they live in `~/.ollama/models`.

---

## macOS Code Signing Notes

For distribution outside the Mac App Store:
1. Requires Apple Developer account ($99/year)
2. Sign the app with `Developer ID Application` certificate
3. Notarize with Apple's notarization service
4. The `scripts/notarize.js` afterSign hook handles this

For private/internal distribution:
- Skip notarization
- Users need to right-click → Open to bypass Gatekeeper on first launch
- Or distribute via system MDM

---

## Windows Code Signing Notes

Windows SmartScreen will warn users about unsigned executables. For production:
1. Purchase EV (Extended Validation) code signing certificate
2. Set `certificateFile` and `certificatePassword` in electron-builder.yml
3. EV certificates bypass SmartScreen immediately

For development/testing: users click "More info → Run anyway" in SmartScreen.
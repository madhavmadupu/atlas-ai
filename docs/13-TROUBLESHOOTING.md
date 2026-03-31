# Atlas AI — Troubleshooting & Common Issues

## Development Issues

### Ollama not starting

**Symptom:** App loads but shows "Ollama offline" or chat returns errors.

**Dev mode:** Ollama must be running separately:
```bash
ollama serve
```
Check it's up: `curl http://localhost:11434/api/tags`

**Production:** Check the sidecar binary:
1. Is the binary in `resources/ollama/`?
2. Is it executable? `chmod +x resources/ollama/ollama-*`
3. Is the platform binary correct? Check `process.platform` and `process.arch`

---

### "Port 3001 already in use"

Another instance of the app is running, or a previous instance didn't clean up.

```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

In the app: add a port conflict check in `startFastifyServer()`:

```typescript
import net from 'net';

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port);
  });
}
```

---

### Electron blank window / white flash

- Make sure `backgroundColor: '#0a0a0a'` is set in BrowserWindow options
- Make sure `show: false` + `ready-to-show` event is used
- In dev: wait for Next.js to be fully up before launching Electron (`wait-on`)

---

### Next.js API routes returning 404 in production

In static export (`output: 'export'`), Next.js API routes don't exist — they're server-side only. This is intentional in the architecture: all API calls go to Fastify on port 3001, not to Next.js API routes. Remove any `app/api/` routes and move them to Fastify.

---

### better-sqlite3 native module errors

better-sqlite3 is a native Node.js addon. It must be compiled for the Electron version, not the system Node.js version.

**Fix:** Use `electron-rebuild` or configure it in `package.json`:

```json
{
  "scripts": {
    "rebuild": "electron-rebuild -f -w better-sqlite3"
  }
}
```

In `electron-builder.yml`:
```yaml
npmRebuild: true
```

---

### "Cannot find module '@atlas/shared'"

The shared package isn't built. Run:
```bash
pnpm build --filter=@atlas/shared
pnpm build --filter=@atlas/db
```

Or add `"^build"` to the desktop's `dependsOn` in `turbo.json`.

---

### TypeScript errors in Electron main process

Electron main runs in Node.js, not a browser. Make sure `tsconfig.json` for `electron/` uses:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",  // Electron main uses CJS
    "lib": ["ES2022"]      // NO DOM lib
  }
}
```

The Next.js renderer uses a separate `tsconfig.json` with DOM lib.

---

## Mobile Issues

### Mobile can't connect to desktop

Checklist:
1. Both devices on the **same Wi-Fi network**? (Phone hotspot won't work — phone needs to reach laptop's IP)
2. Is Atlas AI desktop app running?
3. Is the firewall blocking port 3001?
   - **macOS:** System Settings → Network → Firewall → Allow Atlas AI
   - **Windows:** Windows Defender Firewall → Allow an app → Browse to Atlas AI.exe
4. Is the IP correct? Check `System Settings → Network` (macOS) or `ipconfig` (Windows)
5. Test manually: on phone browser, go to `http://[desktop-ip]:3001/api/health` — should return JSON

---

### Mobile streaming stops mid-response

React Native's `fetch` with ReadableStream works differently per platform. If streaming stops:

**Option 1:** Use a polling approach instead of SSE:
```typescript
// Instead of SSE, poll for chunks
const response = await fetch(url, { method: 'POST', body: ... });
const text = await response.text();  // Wait for full response, no streaming
```

This is less optimal but more reliable. Make it a fallback.

**Option 2:** Use `EventSource` polyfill for React Native:
```bash
pnpm add react-native-sse
```

```typescript
import EventSource from 'react-native-sse';

const es = new EventSource(`http://${ip}:3001/api/chat`, {
  method: 'POST',
  body: JSON.stringify({ ... }),
  headers: { 'Content-Type': 'application/json' },
});
es.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  // handle token
});
```

---

### QR Scanner not working on iOS

Requires camera permission in `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Atlas AI uses the camera to scan QR codes to connect to your desktop."
      }
    }
  }
}
```

And in the component, request permission explicitly:
```typescript
import { Camera } from 'expo-camera';

const [permission, requestPermission] = Camera.useCameraPermissions();

useEffect(() => {
  if (!permission?.granted) requestPermission();
}, []);
```

---

### Expo app crashes on Android with NativeWind

NativeWind v4 requires `react-native-reanimated` and `react-native-css-interop`. Make sure:

1. `babel.config.js` includes:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel', 'react-native-reanimated/plugin'],
  };
};
```

2. Clear cache after adding: `expo start --clear`

---

## Ollama Issues

### Model downloads fail / hang

Ollama downloads can be interrupted. The pull will resume if restarted. If it's stuck:
```bash
# Check what's running
curl http://localhost:11434/api/tags

# Cancel and retry (in Ollama)
ollama rm llama3.2:3b
ollama pull llama3.2:3b
```

### Model is slow to respond

This is normal for larger models on CPU. Expected generation speeds:
- **M1/M2 Mac (metal):** 15-40 tokens/sec for 3B models
- **Modern CPU (no GPU):** 2-8 tokens/sec for 3B models
- **NVIDIA GPU:** 30-80 tokens/sec for 3B models

Recommendations for slow machines:
1. Switch to a smaller model (1B instead of 3B)
2. Switch to higher quantization (Q4 instead of Q8)
3. Reduce context length (fewer messages sent to model)

### "Out of memory" error

The model doesn't fit in RAM. Solutions:
1. Close other applications
2. Use a smaller/more quantized model
3. Reduce `num_ctx` parameter:
```typescript
body: JSON.stringify({
  model: params.model,
  messages: params.messages,
  options: {
    num_ctx: 2048,  // Default is 4096, reduce for less RAM usage
  },
  stream: true,
}),
```

---

## Build & Packaging Issues

### electron-builder fails on macOS

```bash
# Clear electron-builder cache
rm -rf ~/Library/Caches/electron-builder

# Rebuild native modules
cd apps/desktop
pnpm rebuild
```

### Code signing errors on macOS

If you see `errSecInternalComponent` during signing:
```bash
# Unlock keychain
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

For CI builds without code signing, add to `electron-builder.yml`:
```yaml
mac:
  identity: null  # Skip signing
```

### NSIS installer fails on Windows

Make sure `NSIS` is installed (electron-builder should handle this, but if not):
```bash
npm install -g nsis
```

---

## Performance Tips

### SQLite performance

If queries are slow with many messages:
1. Make sure indexes are created (see `04-DATABASE.md`)
2. Enable WAL mode (already done in migrations)
3. For very large conversations (1000+ messages), add pagination to the `findByConversationId` query:

```typescript
const findPaginated = db.prepare(
  `SELECT * FROM messages WHERE conversation_id = ?
   ORDER BY created_at DESC LIMIT ? OFFSET ?`
);
```

### Electron memory usage

Electron can use a lot of RAM. Optimizations:
1. Use `backgroundThrottling: false` in BrowserWindow to keep it responsive
2. Limit Next.js bundle size — avoid heavy libraries in renderer
3. The Ollama model itself uses most of the RAM — this is expected and unavoidable

### Next.js bundle size in Electron

```bash
cd apps/desktop
npx @next/bundle-analyzer
```

Avoid large client-side libraries. Markdown rendering (react-markdown) is fine. Avoid including entire utility libraries (lodash, moment) — use specific imports.
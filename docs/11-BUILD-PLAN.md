# Atlas AI — 8-Week Build Plan

## Philosophy

Build the critical path first: working end-to-end chat before polish. Each week ends with something that actually runs and can be tested.

---

## Week 1 — Monorepo Foundation + Ollama Integration

**Goal:** Running Electron app that can chat with Ollama locally.

### Tasks

- [ ] Initialize Turborepo monorepo with `pnpm`
- [ ] Create `packages/shared` — all types and constants
- [ ] Create `packages/db` — SQLite schema and queries
- [ ] Create `apps/desktop` skeleton — Next.js + Electron wired together
- [ ] Implement `electron/sidecar.ts` — spawn and manage Ollama process
- [ ] Implement `electron/main.ts` — BrowserWindow, app lifecycle
- [ ] Implement `electron/preload.ts` — contextBridge IPC bridge
- [ ] Create basic Fastify server (`server/index.ts`) on port 3001
- [ ] Implement `OllamaService` — `chatStream()` and `listModels()`
- [ ] Implement `/api/chat` route with SSE streaming
- [ ] Implement `/api/health` route
- [ ] Test: can send a message and see streamed response in terminal

### Acceptance Criteria
- `pnpm dev:desktop` starts Electron, loads Next.js page
- `curl -N -X POST http://localhost:3001/api/chat` returns streaming tokens
- Ollama runs as sidecar — no separate terminal needed

---

## Week 2 — Database + Conversation Persistence

**Goal:** Chat history survives app restarts.

### Tasks

- [ ] Implement `packages/db` — migrations, `conversations.queries.ts`, `messages.queries.ts`, `settings.queries.ts`
- [ ] Initialize DB in Electron main on startup (`initDb()`)
- [ ] Implement `ConversationService` in Fastify
- [ ] Wire up conversation endpoints: GET/POST `/api/conversations`, GET `/api/conversations/:id`
- [ ] Update `/api/chat` to save messages to SQLite after stream completes
- [ ] Implement `/api/settings` routes
- [ ] Auto-generate conversation titles using `OllamaService.generateTitle()`

### Acceptance Criteria
- Create a conversation, send messages, restart app — messages still there
- Conversations appear in correct order (newest first)
- Titles are auto-generated after first user message

---

## Week 3 — Desktop UI (Core Chat)

**Goal:** Polished chat interface that non-developers would use.

### Tasks

- [ ] Install and configure shadcn/ui with dark theme
- [ ] Implement `AppShell.tsx` — sidebar + main content layout
- [ ] Implement `Sidebar.tsx` — conversation list with new chat button
- [ ] Implement `ChatWindow.tsx` — message list with auto-scroll
- [ ] Implement `MessageBubble.tsx` — user and assistant bubbles
- [ ] Implement `MessageInput.tsx` — auto-resize textarea with send button
- [ ] Implement `StreamingCursor.tsx` — blinking cursor during streaming
- [ ] Implement `useStreamingResponse.ts` — SSE fetch hook
- [ ] Implement `useChatStore.ts` — Zustand state for messages
- [ ] Wire up `chat/[id]/page.tsx`
- [ ] Implement custom title bar (`TitleBar.tsx`)

### Acceptance Criteria
- Full chat flow works: type → send → see streaming response
- Markdown renders correctly in assistant messages (bold, code, lists)
- Code blocks have syntax highlighting
- Auto-scroll works during streaming
- New conversation button creates and navigates to new chat

---

## Week 4 — Setup Wizard + Model Manager

**Goal:** First-launch experience that requires zero technical knowledge.

### Tasks

- [ ] Implement `SetupWizard.tsx` — welcome → pick model → download → done
- [ ] Implement `ModelDownloadProgress.tsx` — live progress bar
- [ ] Implement `/api/models` routes — list, pull (SSE), delete
- [ ] Implement `useModelsStore.ts` — model state
- [ ] Implement `models/page.tsx` — full model manager
- [ ] Implement `ModelSelector.tsx` — dropdown to switch model in chat
- [ ] Wire setup completion to settings store
- [ ] Implement Ollama installer download flow (Approach A)
- [ ] Handle edge case: Ollama already installed
- [ ] Add system tray (`tray.ts`)

### Acceptance Criteria
- Fresh install: wizard shows, model downloads with % progress, app is ready
- Model manager shows installed models with size
- Can delete a model with confirmation
- Can download additional models
- Active model persists across restarts

---

## Week 5 — Mobile App Foundation

**Goal:** Expo app that connects to desktop and has working chat.

### Tasks

- [ ] Create `apps/mobile` with Expo Router + NativeWind
- [ ] Configure `app.json` with correct permissions and scheme
- [ ] Implement `connection.store.ts` with AsyncStorage persistence
- [ ] Implement `connect.tsx` — manual IP entry flow
- [ ] Implement `useConnectionStore.ts` — check and store desktop connection
- [ ] Implement `app/index.tsx` — routing based on connection state
- [ ] Implement `chat/index.tsx` — conversation list
- [ ] Implement `chat/[id].tsx` — chat view with streaming
- [ ] Implement `useStreamingResponse.ts` (mobile) — SSE over LAN
- [ ] Implement `MessageBubble.tsx` (React Native)
- [ ] Implement `MessageInput.tsx` (React Native)
- [ ] Implement `TypingIndicator.tsx`

### Acceptance Criteria
- Enter desktop IP in mobile app → connects
- Can see all conversations from desktop
- Can send messages and receive streaming responses over Wi-Fi
- Keyboard avoiding works correctly on iOS and Android

---

## Week 6 — Mobile QR Pairing + Polish

**Goal:** QR code pairing and mobile UI polish.

### Tasks

- [ ] Implement `pairing.routes.ts` in Fastify — token generation and verification
- [ ] Implement `QRScanner.tsx` using expo-camera
- [ ] Add QR code display to desktop settings page (qrcode package)
- [ ] Implement `connect.tsx` QR flow on mobile
- [ ] Test QR pairing end-to-end on real devices
- [ ] Mobile: add connection status indicator in chat header
- [ ] Mobile: add swipe-to-delete on conversations
- [ ] Mobile: handle connection loss gracefully (retry + error UI)
- [ ] Mobile: pull-to-refresh on conversation list
- [ ] Desktop: add connection info to settings page (LAN IP display)
- [ ] Desktop: add conversation delete with confirmation

### Acceptance Criteria
- QR code appears in desktop settings
- Scanning QR on mobile connects without typing IP
- Connection persists on mobile app restart
- Mobile shows clear error when desktop is unreachable

---

## Week 7 — Advanced Features

**Goal:** Features that make Atlas AI genuinely useful beyond basic chat.

### Tasks

- [ ] Implement conversation search (full-text search via SQLite FTS5)
- [ ] Implement system prompt per conversation (editable in conversation header)
- [ ] Implement conversation rename (click title to edit)
- [ ] Implement conversation export to markdown file
- [ ] Add token count display (from Ollama response metadata)
- [ ] Add stop generation button (abort ongoing stream)
- [ ] Implement copy message button on hover
- [ ] Implement regenerate last response button
- [ ] Add model context length display in model manager
- [ ] Desktop: keyboard shortcuts (Cmd+N new, Cmd+K search, Cmd+, settings)
- [ ] Mobile: haptic feedback on send

### Acceptance Criteria
- Search finds messages across all conversations
- System prompt is saved per conversation and sent to Ollama
- Can stop streaming mid-response

---

## Week 8 — Testing, Polish & Release Prep

**Goal:** Production-ready app ready for distribution.

### Tasks

- [ ] Fix all TypeScript errors (zero `any` types without comments)
- [ ] Test on macOS (Intel + M-series), Windows 11, Ubuntu 22.04
- [ ] Test mobile on iOS 17, Android 14
- [ ] Test with all recommended models (7 models)
- [ ] Test with 1000+ messages in a conversation (performance)
- [ ] Implement proper error boundaries in React
- [ ] Add loading states everywhere (skeleton loaders)
- [ ] Implement onboarding tooltips for first-time users
- [ ] App icons for all platforms (1024×1024 master icon)
- [ ] DMG background image for macOS
- [ ] NSIS installer pages for Windows
- [ ] Configure GitHub Actions for automated builds
- [ ] Write README.md with installation instructions
- [ ] Test auto-update flow
- [ ] Release v1.0.0 on GitHub Releases

### Acceptance Criteria
- App installs and runs without any terminal commands
- First-launch to first-chat in under 5 minutes (including model download)
- No crashes during normal usage across all platforms
- Bundle size: desktop installer under 200MB, mobile APK under 50MB

---

## GitHub Actions CI/CD

`.github/workflows/build.yml`:

```yaml
name: Build Desktop App

on:
  push:
    tags: ['v*']

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm build --filter=desktop
      - name: Package
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
        run: cd apps/desktop && pnpm package:mac
      - uses: actions/upload-artifact@v4
        with:
          name: mac-build
          path: apps/desktop/release/**/*.dmg

  build-win:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm build --filter=desktop
      - run: cd apps/desktop && pnpm package:win
      - uses: actions/upload-artifact@v4
        with:
          name: win-build
          path: apps/desktop/release/**/*.exe

  release:
    needs: [build-mac, build-win]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            mac-build/*.dmg
            win-build/*.exe
```

---

## Feature Backlog (Post v1.0)

- **RAG / document chat** — drag in a PDF, chat with it using local embeddings (sqlite-vec or Chroma)
- **Voice input** — Whisper.cpp running locally for speech-to-text
- **Multi-modal** — support for LLaVA and other vision models (drag image into chat)
- **Personas** — saved system prompt presets (Coding assistant, Writing coach, etc.)
- **Plugin system** — tools that the model can call (calculator, local file search)
- **Android standalone** — run a tiny quantized model directly on high-end Android devices using llama.cpp JNI
- **Sync across devices** — encrypted local network sync (no cloud) between multiple desktops
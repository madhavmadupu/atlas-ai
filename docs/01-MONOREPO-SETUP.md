# Atlas AI — Monorepo Setup

## Repository Initialization

### 1. Root `package.json`

```json
{
  "name": "atlas-ai",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "dev:desktop": "turbo run dev --filter=desktop",
    "dev:mobile": "turbo run dev --filter=mobile",
    "build": "turbo run build",
    "build:desktop": "turbo run build --filter=desktop",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### 2. `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "out/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 3. Root `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

### 4. `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### 5. Root `.gitignore`

```
node_modules/
.next/
dist/
out/
.env
.env.local
.env.*.local
*.log
.DS_Store
Thumbs.db
.turbo/
apps/desktop/release/
apps/desktop/.next/
apps/mobile/.expo/
```

---

## Directory Structure (complete)

```
atlas-ai/
│
├── apps/
│   ├── desktop/
│   │   ├── electron/
│   │   │   ├── main.ts           # Electron main process entry
│   │   │   ├── preload.ts        # Preload bridge (contextBridge)
│   │   │   ├── sidecar.ts        # Ollama sidecar spawn + lifecycle
│   │   │   ├── ipc/
│   │   │   │   ├── chat.ipc.ts   # IPC handlers for chat
│   │   │   │   ├── models.ipc.ts # IPC handlers for model management
│   │   │   │   └── system.ipc.ts # IPC handlers for app info/settings
│   │   │   └── tray.ts           # System tray icon + menu
│   │   │
│   │   ├── src/                  # Next.js app
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx      # Redirects to /chat
│   │   │   │   ├── chat/
│   │   │   │   │   ├── page.tsx  # Main chat list sidebar
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Individual conversation
│   │   │   │   ├── models/
│   │   │   │   │   └── page.tsx  # Model manager page
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx  # App settings
│   │   │   │   └── api/          # Next.js API routes (proxy to Fastify)
│   │   │   │       ├── chat/
│   │   │   │       │   └── route.ts
│   │   │   │       └── models/
│   │   │   │           └── route.ts
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── ChatSidebar.tsx
│   │   │   │   │   ├── ChatWindow.tsx
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── MessageInput.tsx
│   │   │   │   │   └── StreamingCursor.tsx
│   │   │   │   ├── models/
│   │   │   │   │   ├── ModelCard.tsx
│   │   │   │   │   ├── ModelDownloadProgress.tsx
│   │   │   │   │   └── ModelSelector.tsx
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   └── TitleBar.tsx
│   │   │   │   └── setup/
│   │   │   │       └── SetupWizard.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useChat.ts
│   │   │   │   ├── useModels.ts
│   │   │   │   ├── useStreamingResponse.ts
│   │   │   │   └── useOllamaStatus.ts
│   │   │   │
│   │   │   ├── store/
│   │   │   │   ├── chat.store.ts
│   │   │   │   ├── models.store.ts
│   │   │   │   └── settings.store.ts
│   │   │   │
│   │   │   └── lib/
│   │   │       ├── api-client.ts   # Typed fetch wrapper for local Fastify API
│   │   │       └── markdown.ts     # Markdown renderer config
│   │   │
│   │   ├── server/                 # Fastify local API server
│   │   │   ├── index.ts            # Server entry + LAN binding
│   │   │   ├── routes/
│   │   │   │   ├── chat.routes.ts
│   │   │   │   ├── models.routes.ts
│   │   │   │   ├── health.routes.ts
│   │   │   │   └── pairing.routes.ts
│   │   │   ├── plugins/
│   │   │   │   ├── cors.plugin.ts
│   │   │   │   └── sse.plugin.ts
│   │   │   └── services/
│   │   │       ├── ollama.service.ts
│   │   │       └── conversation.service.ts
│   │   │
│   │   ├── resources/              # Bundled binaries (gitignored, downloaded at build)
│   │   │   └── .gitkeep
│   │   │
│   │   ├── next.config.mjs
│   │   ├── electron-builder.yml
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/
│       ├── app/                    # Expo Router
│       │   ├── _layout.tsx
│       │   ├── index.tsx           # Redirects to /chat or /connect
│       │   ├── connect.tsx         # Desktop pairing screen
│       │   ├── chat/
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx       # Conversation list
│       │   │   └── [id].tsx        # Active conversation
│       │   └── settings.tsx
│       │
│       ├── components/
│       │   ├── chat/
│       │   │   ├── ChatList.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── MessageInput.tsx
│       │   │   └── TypingIndicator.tsx
│       │   ├── connect/
│       │   │   ├── QRScanner.tsx
│       │   │   └── ManualIPInput.tsx
│       │   └── shared/
│       │       ├── Button.tsx
│       │       └── LoadingSpinner.tsx
│       │
│       ├── hooks/
│       │   ├── useDesktopConnection.ts
│       │   ├── useChat.ts
│       │   └── useStreamingResponse.ts
│       │
│       ├── store/
│       │   ├── connection.store.ts
│       │   └── chat.store.ts
│       │
│       ├── lib/
│       │   ├── api-client.ts
│       │   └── mdns-discovery.ts
│       │
│       ├── app.json
│       ├── babel.config.js
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── chat.types.ts
│   │   │   │   ├── model.types.ts
│   │   │   │   ├── api.types.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── models.constants.ts
│   │   │   │   └── api.constants.ts
│   │   │   └── utils/
│   │   │       ├── format.ts
│   │   │       └── id.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── db/
│       ├── src/
│       │   ├── schema.ts           # SQLite schema definition
│       │   ├── migrations/         # SQL migration files
│       │   ├── queries/
│       │   │   ├── conversations.queries.ts
│       │   │   ├── messages.queries.ts
│       │   │   └── settings.queries.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── turbo.json
├── package.json
├── tsconfig.json
├── .prettierrc
└── .gitignore
```

---

## Package Dependency Graph

```
desktop → shared, db, ui (optional)
mobile  → shared, ui (optional)
db      → (no internal deps)
shared  → (no internal deps)
```

## Key Dev Commands

```bash
# Install deps
pnpm install

# Run desktop in dev mode (Electron + Next.js + Fastify all start)
pnpm dev:desktop

# Run mobile in dev mode
pnpm dev:mobile

# Build desktop app for distribution
pnpm build:desktop

# Type check everything
pnpm typecheck
```
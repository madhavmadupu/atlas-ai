# Atlas AI — Settings

## `src/app/settings/page.tsx` — Desktop Settings Page

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ModelSelector } from '@/components/models/ModelSelector';
import { useModelsStore } from '@/store/models.store';
import { getLanIP } from '@/lib/api-client';
import QRCode from 'qrcode';

export default function SettingsPage() {
  const { activeModel } = useModelsStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [lanIP, setLanIP] = useState<string | null>(null);

  const generateQR = async () => {
    const res = await fetch('http://localhost:3001/api/pairing/token');
    const data = await res.json();
    setPairingToken(data.token);
    setLanIP(data.lanIP);
    const qr = await QRCode.toDataURL(data.connectionString, {
      width: 200,
      color: { dark: '#ffffff', light: '#00000000' },
    });
    setQrDataUrl(qr);

    // QR expires in 5 min — auto-clear
    setTimeout(() => {
      setQrDataUrl(null);
      setPairingToken(null);
    }, 5 * 60 * 1000);
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="mb-8 text-2xl font-semibold text-white">Settings</h1>

      {/* Model */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
          Default model
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Active model</p>
              <p className="mt-0.5 text-xs text-white/40">
                Used for all new conversations
              </p>
            </div>
            <ModelSelector />
          </div>
        </div>
      </section>

      {/* Mobile pairing */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
          Mobile app
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          {!qrDataUrl ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Connect your phone</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Both devices must be on the same Wi-Fi
                </p>
                {lanIP && (
                  <p className="mt-1 font-mono text-xs text-white/30">
                    Your IP: {lanIP}:3001
                  </p>
                )}
              </div>
              <button
                onClick={generateQR}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Show QR Code
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img src={qrDataUrl} alt="Pairing QR" className="h-48 w-48" />
              <p className="text-sm text-white/60">
                Scan with Atlas AI on your phone
              </p>
              <p className="font-mono text-xs text-white/30">
                Expires in 5 minutes
              </p>
              <button
                onClick={() => setQrDataUrl(null)}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </section>

      {/* System info */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
          About
        </h2>
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-white/40">
          <p>Atlas AI v1.0.0</p>
          <p>All conversations stored locally. No data ever leaves your device.</p>
        </div>
      </section>
    </div>
  );
}
```

---

## Settings API Routes (Fastify)

Add to `server/routes/` — `settings.routes.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { getDb } from '@atlas/db';

export async function settingsRoutes(fastify: FastifyInstance) {
  const db = getDb();

  // GET /api/settings — all settings
  fastify.get('/settings', async () => {
    return db.settings.getAll();
  });

  // GET /api/settings/:key
  fastify.get<{ Params: { key: string } }>(
    '/settings/:key',
    async (request, reply) => {
      const value = db.settings.get(request.params.key);
      if (value === null) return reply.status(404).send({ error: 'Not found' });
      return { key: request.params.key, value };
    },
  );

  // POST /api/settings
  fastify.post<{ Body: { key: string; value: string } }>(
    '/settings',
    async (request) => {
      db.settings.set(request.body.key, request.body.value);
      return { success: true };
    },
  );
}
```

---

## `src/store/settings.store.ts`

```typescript
import { create } from 'zustand';

interface Settings {
  defaultModel: string;
  theme: 'dark';
  fontSize: number;
  streamResponses: boolean;
  systemPrompt: string;
}

interface SettingsStore {
  settings: Settings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
}

const DEFAULTS: Settings = {
  defaultModel: 'llama3.2:3b',
  theme: 'dark',
  fontSize: 14,
  streamResponses: true,
  systemPrompt: '',
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULTS,
  isLoaded: false,

  loadSettings: async () => {
    const res = await fetch('http://localhost:3001/api/settings');
    if (!res.ok) return;
    const raw = await res.json();

    set({
      settings: {
        defaultModel: raw.default_model ?? DEFAULTS.defaultModel,
        theme: 'dark',
        fontSize: parseInt(raw.font_size ?? '14'),
        streamResponses: raw.stream_responses !== 'false',
        systemPrompt: raw.system_prompt ?? '',
      },
      isLoaded: true,
    });
  },

  updateSetting: async (key, value) => {
    const keyMap: Record<keyof Settings, string> = {
      defaultModel: 'default_model',
      theme: 'theme',
      fontSize: 'font_size',
      streamResponses: 'stream_responses',
      systemPrompt: 'system_prompt',
    };

    set((s) => ({ settings: { ...s.settings, [key]: value } }));

    await fetch('http://localhost:3001/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyMap[key], value: String(value) }),
    });
  },
}));
```
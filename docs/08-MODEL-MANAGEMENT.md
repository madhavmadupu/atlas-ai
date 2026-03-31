# Atlas AI — Model Management

## Overview

The Model Manager lets users:
- See all locally installed Ollama models with size and details
- Download new models from the curated list with live progress
- Delete models to free disk space
- Switch the active model for chat

All model operations go through the Fastify API → Ollama. No internet connection is needed after a model is downloaded.

---

## `src/app/models/page.tsx` — Desktop Model Manager Page

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Download, Trash2, CheckCircle } from 'lucide-react';
import { useModelsStore } from '@/store/models.store';
import { RECOMMENDED_MODELS } from '@atlas/shared/constants';
import { formatBytes, formatPullProgress } from '@atlas/shared/utils';
import type { OllamaModel, RecommendedModel } from '@atlas/shared/types';
import { cn } from '@/lib/utils';

export default function ModelsPage() {
  const { installedModels, loadModels, pullModel, deleteModel, pullProgress, pullingModel } =
    useModelsStore();

  useEffect(() => {
    loadModels();
  }, []);

  const isInstalled = (modelName: string) =>
    installedModels.some((m) => m.name === modelName || m.model === modelName);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="border-b border-white/10 px-8 py-6">
        <h1 className="text-2xl font-semibold text-white">Models</h1>
        <p className="mt-1 text-sm text-white/40">
          All models run locally. Download once, use forever offline.
        </p>
      </div>

      <div className="flex-1 px-8 py-6">
        {/* Installed models */}
        {installedModels.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
              Installed
            </h2>
            <div className="space-y-2">
              {installedModels.map((model) => (
                <InstalledModelRow
                  key={model.name}
                  model={model}
                  onDelete={() => deleteModel(model.name)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Available to download */}
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
            Available models
          </h2>
          <div className="space-y-2">
            {RECOMMENDED_MODELS.map((model) => (
              <RecommendedModelRow
                key={model.name}
                model={model}
                installed={isInstalled(model.name)}
                pulling={pullingModel === model.name}
                progress={pullingModel === model.name ? pullProgress : null}
                onDownload={() => pullModel(model.name)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InstalledModelRow({
  model,
  onDelete,
}: {
  model: OllamaModel;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400" />
          <span className="font-medium text-white">{model.name}</span>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-white/30">
          <span>{model.details?.parameter_size}</span>
          <span>{model.details?.quantization_level}</span>
          <span>{formatBytes(model.size)}</span>
        </div>
      </div>
      <div>
        {confirming ? (
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(); setConfirming(false); }}
              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/30"
            >
              Confirm delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-white/40 transition hover:text-white/60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg p-2 text-white/20 transition hover:bg-white/5 hover:text-white/60"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function RecommendedModelRow({
  model,
  installed,
  pulling,
  progress,
  onDownload,
}: {
  model: RecommendedModel;
  installed: boolean;
  pulling: boolean;
  progress: import('@atlas/shared/types').PullProgress | null;
  onDownload: () => void;
}) {
  const pct = formatPullProgress(progress?.completed, progress?.total);

  return (
    <div
      className={cn(
        'rounded-xl border px-5 py-4 transition',
        installed ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-white/5',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{model.displayName}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                model.tier === 'fast' ? 'bg-green-500/20 text-green-400' :
                model.tier === 'balanced' ? 'bg-blue-500/20 text-blue-400' :
                'bg-purple-500/20 text-purple-400',
              )}
            >
              {model.tier}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/40">{model.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {model.strengths.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/30">
            {model.sizeGB} GB download · {model.ramRequiredGB}GB RAM required
          </p>
        </div>

        <div className="flex-shrink-0">
          {installed ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle size={12} />
              Installed
            </span>
          ) : pulling ? (
            <div className="w-32">
              <div className="mb-1 flex justify-between text-xs text-white/40">
                <span>{progress?.status ?? 'Downloading...'}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <Download size={14} />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## `src/store/models.store.ts`

```typescript
import { create } from 'zustand';
import type { OllamaModel, PullProgress } from '@atlas/shared/types';

interface ModelsStore {
  installedModels: OllamaModel[];
  activeModel: string;
  pullingModel: string | null;
  pullProgress: PullProgress | null;

  loadModels: () => Promise<void>;
  pullModel: (name: string) => Promise<void>;
  deleteModel: (name: string) => Promise<void>;
  setActiveModel: (name: string) => void;
}

export const useModelsStore = create<ModelsStore>((set, get) => ({
  installedModels: [],
  activeModel: 'llama3.2:3b',
  pullingModel: null,
  pullProgress: null,

  loadModels: async () => {
    const res = await fetch('http://localhost:3001/api/models');
    if (!res.ok) return;
    const models: OllamaModel[] = await res.json();
    set({ installedModels: models });

    // Auto-select first model if current not installed
    const { activeModel } = get();
    const stillInstalled = models.some((m) => m.name === activeModel);
    if (!stillInstalled && models.length > 0) {
      set({ activeModel: models[0].name });
    }
  },

  pullModel: async (name) => {
    set({ pullingModel: name, pullProgress: null });

    try {
      const response = await fetch('http://localhost:3001/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const progress: PullProgress = JSON.parse(line.slice(6));
            set({ pullProgress: progress });
            if (progress.status === 'success') {
              await get().loadModels();
              set({ activeModel: name });
            }
          } catch {
            // Skip
          }
        }
      }
    } finally {
      set({ pullingModel: null, pullProgress: null });
    }
  },

  deleteModel: async (name) => {
    await fetch(`http://localhost:3001/api/models/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    await get().loadModels();
  },

  setActiveModel: (name) => set({ activeModel: name }),
}));
```

---

## `src/hooks/useOllamaStatus.ts`

```typescript
import { useEffect, useState } from 'react';

interface OllamaStatus {
  isRunning: boolean;
  isSetupComplete: boolean;
  isLoading: boolean;
}

export function useOllamaStatus(): OllamaStatus {
  const [isRunning, setIsRunning] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        // Check if Fastify + Ollama are up
        const healthRes = await fetch('http://localhost:3001/api/health/ollama', {
          signal: AbortSignal.timeout(3000),
        });
        const health = await healthRes.json();
        setIsRunning(health.status === 'running');

        // Check if setup is complete (model downloaded)
        const settingsRes = await fetch('http://localhost:3001/api/settings/setup_complete');
        const settings = await settingsRes.json();
        setIsSetupComplete(settings.value === 'true');
      } catch {
        setIsRunning(false);
        setIsSetupComplete(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
    // Re-check every 10 seconds
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, []);

  return { isRunning, isSetupComplete, isLoading };
}
```

---

## `src/components/models/ModelSelector.tsx` — Dropdown in chat header

```tsx
'use client';

import { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { useModelsStore } from '@/store/models.store';

export function ModelSelector() {
  const { installedModels, activeModel, setActiveModel, loadModels } = useModelsStore();

  useEffect(() => {
    loadModels();
  }, []);

  if (installedModels.length === 0) return null;

  return (
    <Select.Root value={activeModel} onValueChange={setActiveModel}>
      <Select.Trigger className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/70">
        <Select.Value />
        <ChevronDown size={12} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl">
          <Select.Viewport className="p-1">
            {installedModels.map((model) => (
              <Select.Item
                key={model.name}
                value={model.name}
                className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-white/70 outline-none hover:bg-white/5 hover:text-white data-[state=checked]:text-indigo-400"
              >
                <Select.ItemText>{model.name}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
```
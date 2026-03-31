"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSettingsStore } from "@/store/settings.store";
import { useModelsStore } from "@/store/models.store";

export default function SettingsPage() {
  const { settings, loadSettings, updateSetting } = useSettingsStore();
  const { installedModels, loadModels } = useModelsStore();

  useEffect(() => {
    loadSettings();
    loadModels();
  }, [loadSettings, loadModels]);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 text-xl font-semibold">Settings</h1>

          {/* Default Model */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-white/60">
              Default Model
            </h2>
            <select
              value={settings.defaultModel}
              onChange={(e) => updateSetting("defaultModel", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
            >
              {installedModels.map((model) => (
                <option
                  key={model.name}
                  value={model.name}
                  className="bg-[#1a1a1a]"
                >
                  {model.name}
                </option>
              ))}
              {installedModels.length === 0 && (
                <option value={settings.defaultModel} className="bg-[#1a1a1a]">
                  {settings.defaultModel} (not installed)
                </option>
              )}
            </select>
          </section>

          {/* System Prompt */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-white/60">
              Default System Prompt
            </h2>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => updateSetting("systemPrompt", e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
              placeholder="Enter a system prompt for new conversations..."
            />
            <p className="mt-1 text-xs text-white/30">
              Applied to all new conversations. Leave empty for no system
              prompt.
            </p>
          </section>

          {/* Streaming */}
          <section className="mb-8">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white/90">Stream responses</p>
                <p className="text-xs text-white/40">
                  Show tokens as they arrive
                </p>
              </div>
              <button
                onClick={() =>
                  updateSetting(
                    "streamResponses",
                    !settings.streamResponses,
                  )
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.streamResponses ? "bg-indigo-600" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    settings.streamResponses
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-white/60">About</h2>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm text-white/80">Atlas AI Desktop</p>
              <p className="mt-1 text-xs text-white/40">Version 0.1.0</p>
              <p className="mt-3 text-xs text-white/30">
                100% offline. Your conversations never leave your device. No
                accounts, no cloud, no telemetry.
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useModelsStore } from "@/store/models.store";
import { formatBytes, formatPullProgress, cn } from "@/lib/utils";
import { RECOMMENDED_MODELS } from "@/lib/constants";

export default function ModelsPage() {
  const {
    installedModels,
    isLoading,
    pullingModel,
    pullProgress,
    loadModels,
    pullModel,
    deleteModel,
  } = useModelsStore();

  const [pullInput, setPullInput] = useState("");

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handlePull = async () => {
    const name = pullInput.trim();
    if (!name || pullingModel) return;
    setPullInput("");
    await pullModel(name);
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-xl font-semibold">Model Management</h1>

          {/* Pull Model */}
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-white/60">
              Pull a Model
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={pullInput}
                onChange={(e) => setPullInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePull()}
                placeholder="e.g. llama3.2:3b"
                disabled={!!pullingModel}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/20 disabled:opacity-50"
              />
              <button
                onClick={handlePull}
                disabled={!pullInput.trim() || !!pullingModel}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-white/10 disabled:text-white/30"
              >
                Pull
              </button>
            </div>

            {/* Pull Progress */}
            {pullingModel && pullProgress && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    Pulling {pullingModel}...
                  </span>
                  <span className="text-white/50">
                    {formatPullProgress(
                      pullProgress.completed,
                      pullProgress.total,
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{
                      width:
                        pullProgress.total && pullProgress.completed
                          ? `${(pullProgress.completed / pullProgress.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {pullProgress.status}
                </p>
              </div>
            )}
          </div>

          {/* Installed Models */}
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-white/60">
              Installed Models
            </h2>
            {isLoading ? (
              <p className="text-sm text-white/40">Loading models...</p>
            ) : installedModels.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/40">
                No models installed. Pull one above or choose from recommended
                models below.
              </p>
            ) : (
              <div className="space-y-2">
                {installedModels.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white/90">
                        {model.name}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatBytes(model.size)}
                        {model.details?.parameter_size &&
                          ` \u00B7 ${model.details.parameter_size}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteModel(model.name)}
                      className="rounded-lg px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Models */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-white/60">
              Recommended Models
            </h2>
            <div className="space-y-2">
              {RECOMMENDED_MODELS.map((model) => {
                const isInstalled = installedModels.some(
                  (m) => m.name === model.id,
                );
                const isPulling = pullingModel === model.id;
                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white/90">
                          {model.name}
                        </p>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            model.tier === "fast"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : model.tier === "balanced"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-purple-500/20 text-purple-400",
                          )}
                        >
                          {model.tier}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        {model.size} \u00B7 {model.ram} RAM \u00B7{" "}
                        {model.description}
                      </p>
                    </div>
                    {isInstalled ? (
                      <span className="text-xs text-emerald-400">
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => pullModel(model.id)}
                        disabled={!!pullingModel}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/15 disabled:opacity-50"
                      >
                        {isPulling ? "Pulling..." : "Pull"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

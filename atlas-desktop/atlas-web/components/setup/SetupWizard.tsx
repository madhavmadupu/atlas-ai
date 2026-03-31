"use client";

import { useState } from "react";
import { useModelsStore } from "@/store/models.store";
import { useSettingsStore } from "@/store/settings.store";
import { useOllamaStatus } from "@/hooks/useOllamaStatus";
import { RECOMMENDED_MODELS } from "@/lib/constants";
import { cn, formatPullProgress } from "@/lib/utils";

type Step = "welcome" | "pick-model" | "downloading" | "done";

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedModel, setSelectedModel] = useState(
    RECOMMENDED_MODELS[0].id,
  );
  const { isConnected } = useOllamaStatus();
  const { pullModel, pullingModel, pullProgress } = useModelsStore();
  const { updateSetting } = useSettingsStore();

  const handleStartDownload = async () => {
    setStep("downloading");
    await pullModel(selectedModel);
    await updateSetting("setupComplete", true);
    setStep("done");
  };

  const quickModels = RECOMMENDED_MODELS.filter(
    (m) => m.tier === "fast" || m.tier === "balanced",
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md px-6">
        {/* Welcome */}
        {step === "welcome" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/20">
              <svg
                className="h-10 w-10 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Welcome to Atlas AI</h1>
            <p className="mb-8 text-sm text-white/50">
              Your private, offline AI assistant. Everything runs locally on
              your machine.
            </p>

            {!isConnected && (
              <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                Waiting for Ollama to start...
              </div>
            )}

            <button
              onClick={() => setStep("pick-model")}
              disabled={!isConnected}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-white/10 disabled:text-white/30"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Pick Model */}
        {step === "pick-model" && (
          <div>
            <h2 className="mb-2 text-xl font-bold">Choose a Model</h2>
            <p className="mb-6 text-sm text-white/50">
              Pick a model to download. You can add more later.
            </p>

            <div className="mb-6 space-y-2">
              {quickModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                    selectedModel === model.id
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model.name}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          model.tier === "fast"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400",
                        )}
                      >
                        {model.tier}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      {model.size} \u00B7 {model.ram} RAM
                    </p>
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2",
                      selectedModel === model.id
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-white/30",
                    )}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={handleStartDownload}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Download & Continue
            </button>
          </div>
        )}

        {/* Downloading */}
        {step === "downloading" && (
          <div className="text-center">
            <h2 className="mb-2 text-xl font-bold">Downloading Model</h2>
            <p className="mb-6 text-sm text-white/50">
              This may take a few minutes depending on your connection.
            </p>

            <div className="mb-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-white/70">{pullingModel}</span>
                <span className="text-white/50">
                  {formatPullProgress(
                    pullProgress?.completed,
                    pullProgress?.total,
                  )}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{
                    width:
                      pullProgress?.total && pullProgress?.completed
                        ? `${(pullProgress.completed / pullProgress.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              {pullProgress?.status && (
                <p className="mt-2 text-xs text-white/40">
                  {pullProgress.status}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-10 w-10 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold">You&apos;re All Set!</h2>
            <p className="mb-8 text-sm text-white/50">
              Atlas AI is ready. Start chatting with your private AI assistant.
            </p>
            <button
              onClick={onComplete}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Start Chatting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

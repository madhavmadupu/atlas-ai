"use client";

import { useState, useRef, useEffect } from "react";
import { useModelsStore } from "@/store/models.store";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const { installedModels, activeModel, setActiveModel, loadModels } =
    useModelsStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
        {activeModel}
        <svg
          className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[200px] rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl">
          {installedModels.length === 0 ? (
            <p className="px-3 py-2 text-xs text-white/40">
              No models installed
            </p>
          ) : (
            installedModels.map((model) => (
              <button
                key={model.name}
                onClick={() => {
                  setActiveModel(model.name);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/5",
                  model.name === activeModel
                    ? "text-indigo-400"
                    : "text-white/70",
                )}
              >
                {model.name === activeModel && (
                  <svg
                    className="h-3 w-3 text-indigo-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span>{model.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

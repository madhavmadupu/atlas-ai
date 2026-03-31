import { useState, useEffect, useCallback } from "react";
import { API_ROUTES, HEALTH_POLL_INTERVAL_MS } from "@/lib/constants";

type OllamaStatus = "connected" | "disconnected" | "checking";

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("checking");
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.healthOllama, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status === "running" ? "connected" : "disconnected");
      } else {
        setStatus("disconnected");
      }
    } catch {
      setStatus("disconnected");
    }

    try {
      const res = await fetch(API_ROUTES.setting("setup_complete"), {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        setIsSetupComplete(data.value === "true" || data.value === true);
      }
    } catch {
      // Not yet available
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, HEALTH_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return {
    status,
    isConnected: status === "connected",
    isSetupComplete,
    isLoading: status === "checking",
  };
}

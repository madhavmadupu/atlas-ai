import { ChildProcess, spawn, execSync } from "child_process";
import path from "path";
import { app } from "electron";
import fs from "fs";

let ollamaProcess: ChildProcess | null = null;

/**
 * Find the Ollama binary — tries system PATH first, then bundled.
 */
function findOllamaBinary(): string | null {
  // 1. Try system-installed Ollama (most common on user machines)
  try {
    const cmd = process.platform === "win32" ? "where ollama" : "which ollama";
    const systemPath = execSync(cmd, { encoding: "utf-8" }).trim().split("\n")[0];
    if (systemPath && fs.existsSync(systemPath)) {
      return systemPath;
    }
  } catch {
    // Not in PATH
  }

  // 2. Windows: check common install locations
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
      path.join(process.env.PROGRAMFILES || "", "Ollama", "ollama.exe"),
      path.join(process.env.USERPROFILE || "", "AppData", "Local", "Programs", "Ollama", "ollama.exe"),
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
  }

  // 3. Try bundled binary (for packaged distribution)
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, "ollama")
    : path.join(app.getAppPath(), "resources", "ollama");

  const binaryName =
    process.platform === "win32"
      ? "ollama.exe"
      : process.platform === "darwin"
        ? process.arch === "arm64"
          ? "ollama-darwin-arm64"
          : "ollama-darwin-amd64"
        : process.arch === "arm64"
          ? "ollama-linux-arm64"
          : "ollama-linux-amd64";

  const bundledPath = path.join(resourcesPath, binaryName);
  if (fs.existsSync(bundledPath)) return bundledPath;

  return null;
}

function getModelsDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA || home, "ollama", "models");
  }
  return path.join(home, ".ollama", "models");
}

export async function pingOllama(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startOllamaSidecar(): Promise<void> {
  // Check if Ollama is already running (user started it, or system service)
  const alreadyRunning = await pingOllama();
  if (alreadyRunning) {
    console.log("[Ollama] Already running on localhost:11434");
    return;
  }

  // Find the binary
  const binaryPath = findOllamaBinary();
  if (!binaryPath) {
    console.error(
      "[Ollama] Not found. Please install Ollama from https://ollama.com",
    );
    return;
  }

  console.log("[Ollama] Starting from:", binaryPath);

  if (process.platform !== "win32") {
    try {
      fs.chmodSync(binaryPath, 0o755);
    } catch {
      // May not have permission, that's fine if it's a system binary
    }
  }

  return new Promise((resolve) => {
    ollamaProcess = spawn(binaryPath, ["serve"], {
      env: {
        ...process.env,
        OLLAMA_HOST: "127.0.0.1:11434",
        OLLAMA_ORIGINS: "*",
        OLLAMA_MODELS: getModelsDir(),
      },
      stdio: ["ignore", "pipe", "pipe"],
      // Detach on Windows so it doesn't block quit
      ...(process.platform === "win32" ? { windowsHide: true } : {}),
    });

    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    ollamaProcess.stdout?.on("data", (data: Buffer) => {
      const line = data.toString();
      console.log("[Ollama]", line.trim());
      if (
        line.includes("Listening on") ||
        line.includes("127.0.0.1:11434")
      ) {
        finish();
      }
    });

    ollamaProcess.stderr?.on("data", (data: Buffer) => {
      const line = data.toString();
      // Ollama logs to stderr by default
      console.log("[Ollama]", line.trim());
      if (
        line.includes("Listening on") ||
        line.includes("127.0.0.1:11434")
      ) {
        finish();
      }
    });

    ollamaProcess.on("error", (err) => {
      console.error("[Ollama] Failed to spawn:", err.message);
      finish();
    });

    ollamaProcess.on("exit", (code) => {
      console.log("[Ollama] Process exited with code:", code);
      ollamaProcess = null;
      finish();
    });

    // Fallback: don't block startup forever
    // Poll for readiness instead of just timing out
    const pollReady = setInterval(async () => {
      if (await pingOllama()) {
        clearInterval(pollReady);
        finish();
      }
    }, 500);

    setTimeout(() => {
      clearInterval(pollReady);
      finish();
    }, 10000);
  });
}

export async function stopOllamaSidecar(): Promise<void> {
  if (!ollamaProcess) return;

  if (process.platform === "win32") {
    // On Windows, SIGTERM doesn't work well on child processes
    try {
      ollamaProcess.kill();
    } catch {
      // Already dead
    }
  } else {
    ollamaProcess.kill("SIGTERM");
  }

  ollamaProcess = null;
  console.log("[Ollama] Sidecar stopped");
}

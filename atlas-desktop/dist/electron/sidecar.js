"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingOllama = pingOllama;
exports.startOllamaSidecar = startOllamaSidecar;
exports.stopOllamaSidecar = stopOllamaSidecar;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
let ollamaProcess = null;
function getOllamaBinaryPath() {
    const platform = process.platform;
    const arch = process.arch;
    const resourcesPath = electron_1.app.isPackaged
        ? path_1.default.join(process.resourcesPath, "ollama")
        : path_1.default.join(electron_1.app.getAppPath(), "..", "resources", "ollama");
    const binaryName = platform === "win32"
        ? "ollama.exe"
        : platform === "darwin"
            ? arch === "arm64"
                ? "ollama-darwin-arm64"
                : "ollama-darwin-amd64"
            : arch === "arm64"
                ? "ollama-linux-arm64"
                : "ollama-linux-amd64";
    return path_1.default.join(resourcesPath, binaryName);
}
function getModelsDir() {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    if (process.platform === "win32") {
        return path_1.default.join(process.env.LOCALAPPDATA || home, "ollama", "models");
    }
    return path_1.default.join(home, ".ollama", "models");
}
async function pingOllama() {
    try {
        const res = await fetch("http://localhost:11434/api/tags", {
            signal: AbortSignal.timeout(2000),
        });
        return res.ok;
    }
    catch {
        return false;
    }
}
async function startOllamaSidecar() {
    // In dev, assume Ollama is already running externally
    if (process.env.NODE_ENV === "development") {
        const running = await pingOllama();
        if (running) {
            console.log("[Ollama] Already running on localhost:11434");
        }
        else {
            console.log("[Ollama] Not detected on localhost:11434 — please start Ollama manually");
        }
        return;
    }
    // Check if already running
    const alreadyRunning = await pingOllama();
    if (alreadyRunning) {
        console.log("[Ollama] Already running");
        return;
    }
    const binaryPath = getOllamaBinaryPath();
    if (!fs_1.default.existsSync(binaryPath)) {
        console.error("[Ollama] Binary not found at:", binaryPath, "— user must install Ollama separately");
        return;
    }
    if (process.platform !== "win32") {
        fs_1.default.chmodSync(binaryPath, 0o755);
    }
    return new Promise((resolve) => {
        ollamaProcess = (0, child_process_1.spawn)(binaryPath, ["serve"], {
            env: {
                ...process.env,
                OLLAMA_HOST: "127.0.0.1:11434",
                OLLAMA_ORIGINS: "*",
                OLLAMA_MODELS: getModelsDir(),
            },
            stdio: ["ignore", "pipe", "pipe"],
        });
        ollamaProcess.stdout?.on("data", (data) => {
            const line = data.toString();
            console.log("[Ollama]", line.trim());
            if (line.includes("Listening on") ||
                line.includes("127.0.0.1:11434")) {
                resolve();
            }
        });
        ollamaProcess.stderr?.on("data", (data) => {
            const line = data.toString();
            if (line.includes("level=ERROR") || line.includes("fatal")) {
                console.error("[Ollama ERROR]", line.trim());
            }
        });
        ollamaProcess.on("error", (err) => {
            console.error("[Ollama] Failed to spawn:", err.message);
            resolve(); // Don't block app startup
        });
        // Fallback timeout — don't wait forever
        setTimeout(resolve, 5000);
    });
}
async function stopOllamaSidecar() {
    if (!ollamaProcess)
        return;
    ollamaProcess.kill("SIGTERM");
    ollamaProcess = null;
    console.log("[Ollama] Sidecar stopped");
}

import { app, BrowserWindow, ipcMain, protocol } from "electron";
import path from "path";
import { startOllamaSidecar, stopOllamaSidecar } from "./sidecar";

const isDev = process.env.NODE_ENV === "development";
let mainWindow: BrowserWindow | null = null;

// Keep reference to server module for cleanup
let serverModule: { startServer: (opts: any) => Promise<any>; stopServer: () => Promise<void> } | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    titleBarOverlay: {
      color: "#0a0a0a",
      symbolColor: "#ffffff",
      height: 36,
    },
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // Load static export from atlas-web/out/
    const indexPath = path.join(
      app.getAppPath(),
      "atlas-web",
      "out",
      "index.html",
    );
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Handle navigation for static export (SPA-style)
function setupProtocolHandler() {
  protocol.handle("file", (request) => {
    const url = request.url;
    // Let normal file requests through
    return protocol.handle("file", request as any) as any;
  });
}

// Register IPC handlers for window controls
function registerIPC() {
  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });

  ipcMain.handle("system:getInfo", () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    };
  });

  ipcMain.handle("system:getPlatform", () => {
    return process.platform;
  });
}

async function bootstrap() {
  // 1. Start Ollama sidecar
  await startOllamaSidecar();

  // 2. Start Fastify server
  try {
    serverModule = require("../dist/server/index");
    await (serverModule as any).startServer({ port: 3001, host: "0.0.0.0" });
    console.log("[Atlas] Fastify server started on port 3001");
  } catch (err) {
    console.error("[Atlas] Failed to start Fastify server:", err);
  }

  // 3. Register IPC handlers
  registerIPC();

  // 4. Create window
  createWindow();
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    cleanup();
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("before-quit", cleanup);

async function cleanup() {
  try {
    if (serverModule) {
      await (serverModule as any).stopServer();
    }
  } catch {
    // Ignore cleanup errors
  }
  await stopOllamaSidecar();
}

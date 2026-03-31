import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { startOllamaSidecar, stopOllamaSidecar } from "./sidecar";

let mainWindow: BrowserWindow | null = null;
let serverCleanup: (() => Promise<void>) | null = null;

const SERVER_PORT = 3001;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

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

  // Load UI from the Fastify server (serves both API and static files)
  mainWindow.loadURL(SERVER_URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIPC() {
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
  ipcMain.handle("system:getInfo", () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  }));
  ipcMain.handle("system:getPlatform", () => process.platform);
}

async function startApiServer(): Promise<void> {
  try {
    // Set DB path to Electron's user data directory
    const { setDbDirectory } = require(
      path.join(__dirname, "..", "server", "db.js"),
    );
    setDbDirectory(app.getPath("userData"));

    // Resolve static files directory (Next.js export output)
    const staticDir = path.join(__dirname, "..", "..", "atlas-web", "out");

    // Start Fastify server — serves both API and static UI
    const { startServer, stopServer } = require(
      path.join(__dirname, "..", "server", "index.js"),
    );
    await startServer({ port: SERVER_PORT, host: "0.0.0.0", staticDir });
    serverCleanup = stopServer;
    console.log("[Atlas] API + UI server started on port", SERVER_PORT);
  } catch (err) {
    console.error("[Atlas] Failed to start server:", err);
  }
}

async function bootstrap() {
  console.log("[Atlas] Starting Atlas AI Desktop...");
  console.log("[Atlas] User data:", app.getPath("userData"));

  // 1. Start Ollama (detect system install or bundled)
  await startOllamaSidecar();

  // 2. Start API + static file server
  await startApiServer();

  // 3. Register IPC handlers
  registerIPC();

  // 4. Create window — loads UI from http://localhost:3001
  createWindow();

  console.log("[Atlas] All systems ready.");
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

app.on("before-quit", async () => {
  if (serverCleanup) {
    try {
      await serverCleanup();
    } catch {
      // Ignore cleanup errors
    }
  }
  await stopOllamaSidecar();
});

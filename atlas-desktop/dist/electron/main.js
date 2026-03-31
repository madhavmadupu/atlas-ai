"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const sidecar_1 = require("./sidecar");
let mainWindow = null;
let serverCleanup = null;
const SERVER_PORT = 3001;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, "preload.js"),
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
    electron_1.ipcMain.handle("window:minimize", () => mainWindow?.minimize());
    electron_1.ipcMain.handle("window:maximize", () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.handle("window:close", () => mainWindow?.close());
    electron_1.ipcMain.handle("system:getInfo", () => ({
        version: electron_1.app.getVersion(),
        platform: process.platform,
        arch: process.arch,
    }));
    electron_1.ipcMain.handle("system:getPlatform", () => process.platform);
}
async function startApiServer() {
    try {
        // Set DB path to Electron's user data directory
        const { setDbDirectory } = require(path_1.default.join(__dirname, "..", "server", "db.js"));
        setDbDirectory(electron_1.app.getPath("userData"));
        // Resolve static files directory (Next.js export output)
        const staticDir = path_1.default.join(__dirname, "..", "..", "atlas-web", "out");
        // Start Fastify server — serves both API and static UI
        const { startServer, stopServer } = require(path_1.default.join(__dirname, "..", "server", "index.js"));
        await startServer({ port: SERVER_PORT, host: "0.0.0.0", staticDir });
        serverCleanup = stopServer;
        console.log("[Atlas] API + UI server started on port", SERVER_PORT);
    }
    catch (err) {
        console.error("[Atlas] Failed to start server:", err);
    }
}
async function bootstrap() {
    console.log("[Atlas] Starting Atlas AI Desktop...");
    console.log("[Atlas] User data:", electron_1.app.getPath("userData"));
    // 1. Start Ollama (detect system install or bundled)
    await (0, sidecar_1.startOllamaSidecar)();
    // 2. Start API + static file server
    await startApiServer();
    // 3. Register IPC handlers
    registerIPC();
    // 4. Create window — loads UI from http://localhost:3001
    createWindow();
    console.log("[Atlas] All systems ready.");
}
electron_1.app.whenReady().then(bootstrap);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (mainWindow === null)
        createWindow();
});
electron_1.app.on("before-quit", async () => {
    if (serverCleanup) {
        try {
            await serverCleanup();
        }
        catch {
            // Ignore cleanup errors
        }
    }
    await (0, sidecar_1.stopOllamaSidecar)();
});
//# sourceMappingURL=main.js.map
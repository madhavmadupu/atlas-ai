"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const sidecar_1 = require("./sidecar");
const isDev = process.env.NODE_ENV === "development";
let mainWindow = null;
// Keep reference to server module for cleanup
let serverModule = null;
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
    if (isDev) {
        mainWindow.loadURL("http://localhost:3000");
        mainWindow.webContents.openDevTools();
    }
    else {
        // Load static export from atlas-web/out/
        const indexPath = path_1.default.join(electron_1.app.getAppPath(), "atlas-web", "out", "index.html");
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
    electron_1.protocol.handle("file", (request) => {
        const url = request.url;
        // Let normal file requests through
        return electron_1.protocol.handle("file", request);
    });
}
// Register IPC handlers for window controls
function registerIPC() {
    electron_1.ipcMain.handle("window:minimize", () => {
        mainWindow?.minimize();
    });
    electron_1.ipcMain.handle("window:maximize", () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.handle("window:close", () => {
        mainWindow?.close();
    });
    electron_1.ipcMain.handle("system:getInfo", () => {
        return {
            version: electron_1.app.getVersion(),
            platform: process.platform,
            arch: process.arch,
        };
    });
    electron_1.ipcMain.handle("system:getPlatform", () => {
        return process.platform;
    });
}
async function bootstrap() {
    // 1. Start Ollama sidecar
    await (0, sidecar_1.startOllamaSidecar)();
    // 2. Start Fastify server
    try {
        serverModule = require("../dist/server/index");
        await serverModule.startServer({ port: 3001, host: "0.0.0.0" });
        console.log("[Atlas] Fastify server started on port 3001");
    }
    catch (err) {
        console.error("[Atlas] Failed to start Fastify server:", err);
    }
    // 3. Register IPC handlers
    registerIPC();
    // 4. Create window
    createWindow();
}
electron_1.app.whenReady().then(bootstrap);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        cleanup();
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on("before-quit", cleanup);
async function cleanup() {
    try {
        if (serverModule) {
            await serverModule.stopServer();
        }
    }
    catch {
        // Ignore cleanup errors
    }
    await (0, sidecar_1.stopOllamaSidecar)();
}

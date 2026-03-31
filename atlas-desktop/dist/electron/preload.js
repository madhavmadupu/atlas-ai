"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    minimize: () => electron_1.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron_1.ipcRenderer.invoke("window:maximize"),
    close: () => electron_1.ipcRenderer.invoke("window:close"),
    getSystemInfo: () => electron_1.ipcRenderer.invoke("system:getInfo"),
    getPlatform: () => electron_1.ipcRenderer.invoke("system:getPlatform"),
    // Model pull progress listener
    onPullProgress: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on("models:pullProgress", handler);
        return () => electron_1.ipcRenderer.removeListener("models:pullProgress", handler);
    },
    // Ollama status listener
    onOllamaStatus: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on("system:ollamaStatus", handler);
        return () => electron_1.ipcRenderer.removeListener("system:ollamaStatus", handler);
    },
});
//# sourceMappingURL=preload.js.map
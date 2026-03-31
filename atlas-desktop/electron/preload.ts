import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  getSystemInfo: () => ipcRenderer.invoke("system:getInfo"),
  getPlatform: () => ipcRenderer.invoke("system:getPlatform"),

  // Model pull progress listener
  onPullProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) =>
      callback(data);
    ipcRenderer.on("models:pullProgress", handler);
    return () => ipcRenderer.removeListener("models:pullProgress", handler);
  },

  // Ollama status listener
  onOllamaStatus: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) =>
      callback(data);
    ipcRenderer.on("system:ollamaStatus", handler);
    return () => ipcRenderer.removeListener("system:ollamaStatus", handler);
  },
});

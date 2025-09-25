"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  sendQuery: (query, pageContent, currentUrl, requestId) => electron.ipcRenderer.invoke("ai-query", { query, pageContent, currentUrl, requestId }),
  onAiStreamChunk: (callback) => {
    const channel = "ai-query-stream-chunk";
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(channel, handler);
    return () => electron.ipcRenderer.removeListener(channel, handler);
  },
  onAiStreamEnd: (callback) => {
    const channel = "ai-query-stream-end";
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(channel, handler);
    return () => electron.ipcRenderer.removeListener(channel, handler);
  },
  onAiStreamError: (callback) => {
    const channel = "ai-query-stream-error";
    const handler = (_event, payload) => callback(payload);
    electron.ipcRenderer.on(channel, handler);
    return () => electron.ipcRenderer.removeListener(channel, handler);
  },
  navigateBrowser: (url) => electron.ipcRenderer.invoke("navigate-browser", url),
  getBrowserState: () => electron.ipcRenderer.invoke("get-browser-state")
});

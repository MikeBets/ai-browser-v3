"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  sendQuery: (query, pageContent) => ipcRenderer.invoke("ai-query", { query, pageContent })
});

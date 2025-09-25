"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  sendQuery: (query, pageContent, currentUrl) => electron.ipcRenderer.invoke("ai-query", { query, pageContent, currentUrl }),
  navigateBrowser: (url) => electron.ipcRenderer.invoke("navigate-browser", url),
  getBrowserState: () => electron.ipcRenderer.invoke("get-browser-state")
});

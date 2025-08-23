const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  sendQuery: (query, pageContent, currentUrl) => ipcRenderer.invoke('ai-query', { query, pageContent, currentUrl }),
  navigateBrowser: (url) => ipcRenderer.invoke('navigate-browser', url),
  getBrowserState: () => ipcRenderer.invoke('get-browser-state')
});
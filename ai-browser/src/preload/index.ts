import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  sendQuery: (query: string, pageContent: string, currentUrl: string) => 
    ipcRenderer.invoke('ai-query', { query, pageContent, currentUrl }),
    
  navigateBrowser: (url: string) => 
    ipcRenderer.invoke('navigate-browser', url),
    
  getBrowserState: () => 
    ipcRenderer.invoke('get-browser-state')
});

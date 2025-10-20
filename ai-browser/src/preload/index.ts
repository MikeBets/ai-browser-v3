import { contextBridge, ipcRenderer } from 'electron';

type StreamChunkPayload = { requestId: string; delta: string };
type StreamEndPayload = { requestId: string; response: { action: string; content?: string; url?: string } };
type StreamErrorPayload = { requestId: string; message: string };

contextBridge.exposeInMainWorld('api', {
  sendQuery: (query: string, pageContent: string, currentUrl: string, requestId: string) =>
    ipcRenderer.invoke('ai-query', { query, pageContent, currentUrl, requestId }),

  onAiStreamChunk: (callback: (payload: StreamChunkPayload) => void) => {
    const channel = 'ai-query-stream-chunk';
    const handler = (_event: Electron.IpcRendererEvent, payload: StreamChunkPayload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  onAiStreamEnd: (callback: (payload: StreamEndPayload) => void) => {
    const channel = 'ai-query-stream-end';
    const handler = (_event: Electron.IpcRendererEvent, payload: StreamEndPayload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  onAiStreamError: (callback: (payload: StreamErrorPayload) => void) => {
    const channel = 'ai-query-stream-error';
    const handler = (_event: Electron.IpcRendererEvent, payload: StreamErrorPayload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  navigateBrowser: (url: string) =>
    ipcRenderer.invoke('navigate-browser', url),

  getBrowserState: () =>
    ipcRenderer.invoke('get-browser-state'),

  // File system operations
  selectDirectory: () =>
    ipcRenderer.invoke('select-directory'),

  getWorkingDirectory: () =>
    ipcRenderer.invoke('get-working-directory'),

  listDirectory: (relativePath?: string) =>
    ipcRenderer.invoke('list-directory', relativePath),

  readFile: (relativePath: string) =>
    ipcRenderer.invoke('read-file', relativePath),

  writeFile: (relativePath: string, content: string) =>
    ipcRenderer.invoke('write-file', relativePath, content),

  // License activation
  activateLicense: (licenseKey: string) =>
    ipcRenderer.invoke('activate-license', { licenseKey })
});

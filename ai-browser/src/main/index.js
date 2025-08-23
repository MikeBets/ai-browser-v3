import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';

dotenv.config();

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(currentDir, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webviewTag: true
    }
  });

  // Load React frontend
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(currentDir, '../renderer/index.html'));
  }
}

// Handle AI queries
ipcMain.handle('ai-query', async (event, { query, pageContent }) => {
  try {
    const result = await streamText({
      model: google('gemini-2.5-flash'),
      prompt: `User query: ${query}\n\nPage content: ${pageContent.substring(0, 1000)}`,
      maxTokens: 500
    });

    // Convert async iterator to array for IPC
    const chunks = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    return chunks.join('');
  } catch (error) {
    console.error('AI Error:', error);
    return 'AI processing error, please try again!';
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
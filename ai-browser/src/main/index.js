import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
import { navigateTo, getPageContent, getPageTitle, getPageURL, takeScreenshot } from './browser-controller.js';

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

// Handle AI Agent queries with browser control
ipcMain.handle('ai-query', async (event, { query, pageContent, currentUrl }) => {
  try {
    const systemPrompt = `You are an AI browser assistant that can help users browse the web and analyze content.
    
    You can perform these actions by returning JSON commands:
    1. Navigate to a website: {"action": "navigate", "url": "https://example.com"}
    2. Search Google: {"action": "search", "query": "search terms"}
    3. Summarize current page: {"action": "summarize", "content": "summary text"}
    4. Answer questions: {"action": "answer", "content": "answer text"}
    5. Extract information: {"action": "extract", "content": "extracted info"}
    
    Current page URL: ${currentUrl}
    Current page content (first 1000 chars): ${pageContent.substring(0, 1000)}
    
    User request: ${query}
    
    Analyze the user's request. If they want to:
    - Visit a specific website or news site, return a navigate action
    - Search for something, return a search action
    - Know about the current page, analyze the content and return summarize/extract/answer
    - Just chat, return an answer action
    
    IMPORTANT: Always return a valid JSON object with "action" and appropriate fields.
    Examples:
    - "Go to CNN" -> {"action": "navigate", "url": "https://www.cnn.com"}
    - "Search for AI news" -> {"action": "search", "query": "AI news"}
    - "What's on this page?" -> {"action": "summarize", "content": "This page contains..."}
    - "Hello" -> {"action": "answer", "content": "Hello! How can I help you browse the web today?"}`;

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: query,
      maxTokens: 500
    });

    // Collect the full response
    const chunks = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    
    const response = chunks.join('');
    console.log('AI Response:', response);
    
    // Try to parse as JSON for commands
    try {
      const parsed = JSON.parse(response);
      return JSON.stringify(parsed);
    } catch {
      // If not valid JSON, wrap as answer
      return JSON.stringify({ action: 'answer', content: response });
    }
  } catch (error) {
    console.error('AI Error:', error);
    return JSON.stringify({ action: 'answer', content: 'Sorry, I encountered an error. Please try again.' });
  }
});

// Handle browser navigation
ipcMain.handle('navigate-browser', async (event, url) => {
  try {
    await navigateTo(url);
    const content = await getPageContent();
    const title = await getPageTitle();
    const currentUrl = await getPageURL();
    const screenshot = await takeScreenshot();
    
    return {
      success: true,
      url: currentUrl,
      title,
      content,
      screenshot: screenshot ? screenshot.toDataURL() : null
    };
  } catch (error) {
    console.error('Navigation error:', error);
    return { success: false, error: error.message };
  }
});

// Get current browser state
ipcMain.handle('get-browser-state', async () => {
  try {
    const content = await getPageContent();
    const title = await getPageTitle();
    const url = await getPageURL();
    
    return {
      url,
      title,
      content
    };
  } catch (error) {
    return { url: '', title: '', content: '' };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
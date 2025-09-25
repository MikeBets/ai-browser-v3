import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { streamText, generateText, tool, jsonSchema, stepCountIs } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import dotenv from 'dotenv';
import { z } from 'zod';
import { navigateTo, getPageContent, getPageTitle, getPageURL, takeScreenshot } from './browser-controller';

dotenv.config();

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey) {
  throw new Error('Missing OPENROUTER_API_KEY environment variable. Please set it in your .env file.');
}

const openrouter = createOpenRouter({
  apiKey: openRouterApiKey
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Expose Chrome DevTools Protocol for electron-mcp (port 9222)
try {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
} catch {}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(currentDir, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
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

// Handle AI Agent queries with multi-step tools
ipcMain.handle('ai-query', async (event: IpcMainInvokeEvent, { query }: { query: string }): Promise<string> => {
  console.log('AI Query received:', query);
  try {
    // Define tools the model can call in multiple steps
    let lastNavigatedUrl: string = '';

    const navigate = tool({
      description: '打开或跳转到指定网页（仅支持 http/https）。',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {
          url: { type: 'string', description: '要打开的完整 URL' }
        },
        required: ['url'],
        additionalProperties: false
      }),
      execute: async ({ url }: { url: string }) => {
        console.log('Tool: navigate called with URL:', url);
        // More robust URL cleaning
        const cleanUrl = url.replace(/^(https?:\/\/)+/, '');
        const finalUrl = `https://${cleanUrl}`;

        lastNavigatedUrl = await navigateTo(finalUrl);
        const title = await getPageTitle();
        console.log('Navigate result:', { url: lastNavigatedUrl, title });
        return { ok: true, url: await getPageURL(), title };
      }
    });

    const readPage = tool({
      description: '读取当前页面的标题与正文（自动截断到安全长度）。',
      inputSchema: jsonSchema({
        type: 'object',
        properties: {},
        additionalProperties: false
      }),
      execute: async () => {
        console.log('Tool: readPage called');
        const url = await getPageURL();
        const title = await getPageTitle();
        const content = await getPageContent();
        console.log('ReadPage result:', { url, title, contentLength: content?.length });
        return { url, title, content };
      }
    });

    // System guidance for multi-step behavior
    const systemPrompt: string = `你是一个"AI 浏览器"代理。你必须按以下步骤处理用户请求：

重要规则：
- 当用户要求"打开X并总结"时，你必须执行两个步骤：
  步骤1: 调用 navigate 工具打开网页
  步骤2: 调用 readPage 工具获取页面内容
  步骤3: 基于获取的内容生成总结

- 绝对不要只调用 navigate 就结束
- 如果用户要求总结或分析页面，你必须先调用 readPage 获取内容
- 只有在获取页面内容后，才能生成有意义的总结

常见北美网站映射（当用户只说站点名时请用对应网址）：
- Hacker News/HN -> https://news.ycombinator.com
- Google News -> https://news.google.com
- CBC -> https://www.cbc.ca
- Global News -> https://globalnews.ca
- CTV -> https://www.ctvnews.ca
- Reuters -> https://www.reuters.com
- AP/Associated Press -> https://apnews.com
- NPR -> https://www.npr.org
- NASA -> https://www.nasa.gov/news/
- FDA -> https://www.fda.gov/news-events/press-announcements
- Bank of Canada/BoC -> https://www.bankofcanada.ca
- Government of Canada/Canada.ca -> https://www.canada.ca
- The Verge -> https://www.theverge.com`;


    console.log('Calling OpenRouter Grok with query...');

    // Enhanced prompt to ensure multi-step execution
    const enhancedPrompt: string = `${query}\n\n记住：你必须执行以下步骤：\n1. 使用 navigate 工具打开网页\n2. 使用 readPage 工具读取页面内容\n3. 基于读取的内容生成总结\n\n不要跳过任何步骤！`;

    // Use generateText for better debugging
    const result = await generateText({
      model: openrouter.chat('x-ai/grok-4-fast:free'),
      system: systemPrompt,
      prompt: enhancedPrompt,
      tools: { navigate, readPage },
      toolChoice: 'auto',
      maxTokens: 800,
      maxSteps: 10,
      stopWhen: stepCountIs(10) // Explicitly enable multi-step
    });

    console.log('Result object:', {
      text: result.text,
      toolCalls: result.toolCalls?.length || 0,
      steps: result.steps?.length || 0,
      usage: result.usage
    });

    // Log each step
    if (result.steps) {
      result.steps.forEach((step, i) => {
        console.log(`Step ${i + 1}:`, {
          toolCalls: step.toolCalls?.map(tc => ({ name: tc.toolName, args: tc.args })),
          text: step.text?.substring(0, 100)
        });
      });
    }

    const finalText = result.text || '';
    // Return as prior protocol for renderer compatibility
    return JSON.stringify({ action: 'answer', content: finalText, url: lastNavigatedUrl || (await getPageURL()) || '' });
  } catch (error: any) {
    console.error('AI Agent Error:', error);
    return JSON.stringify({ action: 'answer', content: '❌ 发生错误：处理失败，请稍后重试。' });
  }
});

// Handle browser navigation
ipcMain.handle('navigate-browser', async (event: IpcMainInvokeEvent, url: string) => {
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
      screenshot: screenshot // Already converted to dataURL in takeScreenshot()
    };
  } catch (error: any) {
    console.error('Navigation error:', error);
    return { success: false, error: error.message };
  }
});

// Get current browser state
ipcMain.handle('get-browser-state', async (event: IpcMainInvokeEvent) => {
  try {
    const content = await getPageContent();
    const title = await getPageTitle();
    const url = await getPageURL();
    
    return {
      url,
      title,
      content
    };
  } catch (error: any) {
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

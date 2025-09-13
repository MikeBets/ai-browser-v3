import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
import { z } from 'zod';
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
ipcMain.handle('ai-query', async (event, { query }) => {
  try {
    // Define tools the model can call in multiple steps
    let lastNavigatedUrl = '';

    const navigate = tool({
      description: '打开或跳转到指定网页（仅支持 http/https）。',
      parameters: z.object({
        url: z.string().describe('要打开的完整 URL')
      }),
      execute: async ({ url }) => {
        // Basic URL guard
        if (!/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
        }
        lastNavigatedUrl = await navigateTo(url);
        const title = await getPageTitle();
        return { ok: true, url: await getPageURL(), title };
      }
    });

    const readPage = tool({
      description: '读取当前页面的标题与正文（自动截断到安全长度）。',
      parameters: z.object({}),
      execute: async () => {
        const url = await getPageURL();
        const title = await getPageTitle();
        const content = await getPageContent();
        return { url, title, content };
      }
    });

    // System guidance for multi-step behavior
    const systemPrompt = `你是一个“AI 浏览器”代理。可以多步调用工具来完成任务：
1) 如需打开网页，请调用 navigate。
2) 在回答与当前页面相关的问题前，必须调用 readPage 获取内容。
3) 最终请输出面向用户的简洁中文回答（不要再输出 JSON）。

常见中文网站映射（当用户只说站点名时请用对应网址）：
- 知乎 -> https://www.zhihu.com
- 百度 -> https://www.baidu.com
- 微博 -> https://weibo.com
- 淘宝 -> https://www.taobao.com
- 京东 -> https://www.jd.com
- 抖音 -> https://www.douyin.com
- B站/bilibili -> https://www.bilibili.com`;

    const result = await streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: query,
      tools: { navigate, readPage },
      maxTokens: 600,
      maxSteps: 4
    });

    const chunks = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }

    const finalText = chunks.join('').trim();
    // Return as prior protocol for renderer compatibility
    return JSON.stringify({ action: 'answer', content: finalText, url: lastNavigatedUrl || (await getPageURL()) || '' });
  } catch (error) {
    console.error('AI Agent Error:', error);
    return JSON.stringify({ action: 'answer', content: '❌ 发生错误：处理失败，请稍后重试。' });
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
      screenshot: screenshot // Already converted to dataURL in takeScreenshot()
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

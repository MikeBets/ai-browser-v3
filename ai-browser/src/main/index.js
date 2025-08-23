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

// Handle AI Agent queries with browser control
ipcMain.handle('ai-query', async (event, { query, pageContent, currentUrl }) => {
  try {
    const systemPrompt = `你是一个AI浏览器助手，可以帮助用户浏览网页和分析内容。你能理解中文和英文。
    
    你可以通过返回JSON命令来执行以下操作：
    1. 导航到网站: {"action": "navigate", "url": "https://example.com"}
    2. 搜索内容: {"action": "search", "query": "搜索词"}
    3. 总结当前页面: {"action": "summarize", "content": "摘要文本"}
    4. 回答问题: {"action": "answer", "content": "回答文本"}
    5. 提取信息: {"action": "extract", "content": "提取的信息"}
    
    当前页面URL: ${currentUrl}
    当前页面内容（前1000字符）: ${pageContent.substring(0, 1000)}
    
    用户请求: ${query}
    
    分析用户的请求。如果他们想要：
    - 访问特定网站（如"去知乎"、"打开百度"），返回navigate动作
    - 搜索内容（如"搜索AI新闻"），返回search动作
    - 了解当前页面（如"这个页面有什么"），分析内容并返回summarize/extract/answer
    - 只是聊天，返回answer动作
    
    重要：始终返回有效的JSON对象，包含"action"和相应的字段。
    
    中文网站映射：
    - "知乎" -> "https://www.zhihu.com"
    - "百度" -> "https://www.baidu.com"
    - "微博" -> "https://weibo.com"
    - "淘宝" -> "https://www.taobao.com"
    - "京东" -> "https://www.jd.com"
    - "抖音" -> "https://www.douyin.com"
    - "bilibili"/"B站" -> "https://www.bilibili.com"
    
    示例：
    - "去知乎" -> {"action": "navigate", "url": "https://www.zhihu.com"}
    - "搜索AI新闻" -> {"action": "search", "query": "AI新闻"}
    - "这个页面有什么内容？" -> {"action": "summarize", "content": "这个页面包含..."}
    - "你好" -> {"action": "answer", "content": "你好！我可以帮你浏览网页，有什么需要帮助的吗？"}`;

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
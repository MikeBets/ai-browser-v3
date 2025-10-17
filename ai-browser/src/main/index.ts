import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, statSync, readdirSync } from 'fs';
import { streamText, tool, zodSchema, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { navigateTo, getPageContent, getPageTitle, getPageURL, takeScreenshot } from './browser-controller';

dotenv.config();

const openAIApiKey = process.env.OPENAI_API_KEY;

if (!openAIApiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable. Please set it in your .env file.');
}

const openai = createOpenAI({
  apiKey: openAIApiKey
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Working directory for file operations
let workingDirectory: string | null = null;

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
ipcMain.handle('ai-query', async (
  event: IpcMainInvokeEvent,
  { query, requestId }: { query: string; requestId?: string }
): Promise<string> => {
  console.log('AI Query received:', query);
  const resolvedRequestId = requestId ?? randomUUID();
  let lastNavigatedUrl = '';

  try {
    // Define tools the model can call in multiple steps

    const navigate = tool({
      description: '打开或跳转到指定网页（仅支持 http/https）。',
      inputSchema: zodSchema(z.object({
        url: z.string().describe('要打开的完整 URL')
      })),
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
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        console.log('Tool: readPage called');
        const url = await getPageURL();
        const title = await getPageTitle();
        const content = await getPageContent();
        console.log('ReadPage result:', { url, title, contentLength: content?.length });
        return { url, title, content };
      }
    });

    // File system tools
    const getWorkingDirectory = tool({
      description: '获取当前设置的工作目录。',
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        console.log('Tool: getWorkingDirectory called');
        if (!workingDirectory) {
          throw new Error('No working directory set. Please ask the user to click the folder button (📁) to select a working directory first.');
        }
        return { workingDirectory };
      }
    });

    const setWorkingDirectory = tool({
      description: '设置工作目录路径。',
      inputSchema: zodSchema(z.object({
        path: z.string().describe('工作目录的完整路径')
      })),
      execute: async ({ path: dirPath }: { path: string }) => {
        console.log('Tool: setWorkingDirectory called with path:', dirPath);

        // Validate path exists and is a directory
        if (!existsSync(dirPath)) {
          throw new Error(`Directory does not exist: ${dirPath}`);
        }

        const stats = statSync(dirPath);
        if (!stats.isDirectory()) {
          throw new Error(`Path is not a directory: ${dirPath}`);
        }

        workingDirectory = path.resolve(dirPath);
        console.log('Working directory set to:', workingDirectory);
        return { workingDirectory, success: true };
      }
    });

    const listDirectory = tool({
      description: '列出工作目录中的文件和文件夹。',
      inputSchema: zodSchema(z.object({
        relativePath: z.string().optional().describe('相对于工作目录的路径，默认为根目录')
      })),
      execute: async ({ relativePath }: { relativePath?: string }) => {
        console.log('Tool: listDirectory called with relativePath:', relativePath);
        if (!workingDirectory) {
          throw new Error('No working directory set. Please use setWorkingDirectory first.');
        }

        const targetPath = relativePath
          ? path.join(workingDirectory, relativePath)
          : workingDirectory;

        if (!existsSync(targetPath)) {
          throw new Error(`Path does not exist: ${targetPath}`);
        }

        const items = readdirSync(targetPath, { withFileTypes: true });
        const result = items.map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other',
          path: workingDirectory ? path.relative(workingDirectory, path.join(targetPath, item.name)) : path.join(targetPath, item.name)
        }));

        console.log('List directory result:', result.length, 'items');
        return { items: result, path: workingDirectory ? path.relative(workingDirectory, targetPath) || '.' : targetPath };
      }
    });

    const readFile = tool({
      description: '读取文件内容。',
      inputSchema: zodSchema(z.object({
        relativePath: z.string().describe('相对于工作目录的文件路径')
      })),
      execute: async ({ relativePath }: { relativePath: string }) => {
        console.log('Tool: readFile called with relativePath:', relativePath);
        if (!workingDirectory) {
          throw new Error('No working directory set. Please use setWorkingDirectory first.');
        }

        const filePath = path.join(workingDirectory, relativePath);

        if (!existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }

        const stats = statSync(filePath);
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${filePath}`);
        }

        // Check file size (limit to 1MB)
        if (stats.size > 1024 * 1024) {
          throw new Error(`File too large: ${stats.size} bytes (max 1MB)`);
        }

        const content = await fs.readFile(filePath, 'utf-8');
        console.log('Read file result:', { path: relativePath, size: content.length });
        return { content, path: relativePath, size: content.length };
      }
    });

    const writeFile = tool({
      description: '写入文件内容。',
      inputSchema: zodSchema(z.object({
        relativePath: z.string().describe('相对于工作目录的文件路径'),
        content: z.string().describe('要写入的文件内容')
      })),
      execute: async ({ relativePath, content }: { relativePath: string; content: string }) => {
        console.log('Tool: writeFile called with relativePath:', relativePath);
        if (!workingDirectory) {
          throw new Error('No working directory set. Please use setWorkingDirectory first.');
        }

        const filePath = path.join(workingDirectory, relativePath);

        // Ensure parent directory exists
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });

        await fs.writeFile(filePath, content, 'utf-8');
        console.log('Write file result:', { path: relativePath, size: content.length });
        return { success: true, path: relativePath, size: content.length };
      }
    });

    const createDirectory = tool({
      description: '创建目录。',
      inputSchema: zodSchema(z.object({
        relativePath: z.string().describe('相对于工作目录的目录路径')
      })),
      execute: async ({ relativePath }: { relativePath: string }) => {
        console.log('Tool: createDirectory called with relativePath:', relativePath);
        if (!workingDirectory) {
          throw new Error('No working directory set. Please use setWorkingDirectory first.');
        }

        const dirPath = path.join(workingDirectory, relativePath);
        await fs.mkdir(dirPath, { recursive: true });
        console.log('Create directory result:', { path: relativePath });
        return { success: true, path: relativePath };
      }
    });

    // System guidance for multi-step behavior
    const systemPrompt: string = `你是一个"AI 浏览器与文件管理"代理。你可以浏览网页并管理文件系统。你必须按以下步骤处理用户请求：

重要规则：
- 当用户要求"打开X并总结"时，你必须执行两个步骤：
  步骤1: 调用 navigate 工具打开网页
  步骤2: 调用 readPage 工具获取页面内容
  步骤3: 基于获取的内容生成总结

- 绝对不要只调用 navigate 就结束
- 如果用户要求总结或分析页面，你必须先调用 readPage 获取内容
- 只有在获取页面内容后，才能生成有意义的总结

文件系统操作：
- 在进行任何文件操作前，用户必须先点击界面上的文件夹按钮（📁）选择工作目录
- 使用 getWorkingDirectory 检查当前工作目录是否已设置
- 使用 listDirectory 列出目录内容
- 使用 readFile 读取文件内容
- 使用 writeFile 写入文件内容
- 使用 createDirectory 创建目录
- 文件路径都是相对于工作目录的
- 如果没有设置工作目录，请明确提醒用户："请先点击界面上的文件夹按钮（📁）选择工作目录"

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

    event.sender.send('ai-query-stream-start', { requestId: resolvedRequestId });

    const result = streamText({
      model: openai('gpt-5-mini'),
      system: systemPrompt,
      prompt: enhancedPrompt,
      tools: {
        navigate,
        readPage,
        getWorkingDirectory,
        listDirectory,
        readFile,
        writeFile,
        createDirectory
      },
      toolChoice: 'auto',
      // maxOutputTokens: 800,
      stopWhen: stepCountIs(15)
    });

    let finalText = '';

    for await (const delta of result.textStream) {
      if (!delta) continue;
      finalText += delta;
      event.sender.send('ai-query-stream-chunk', { requestId: resolvedRequestId, delta });
    }

    const steps = await result.steps;
    const usage = await result.totalUsage;

    console.log('Stream completed:', {
      textLength: finalText.length,
      stepCount: steps?.length || 0,
      usage
    });

    const finalPayload = {
      action: 'answer',
      content: finalText,
      url: lastNavigatedUrl || (await getPageURL()) || ''
    };

    event.sender.send('ai-query-stream-end', {
      requestId: resolvedRequestId,
      response: finalPayload
    });

    return JSON.stringify(finalPayload);
  } catch (error: any) {
    console.error('AI Agent Error:', error);
    event.sender.send('ai-query-stream-error', {
      requestId: resolvedRequestId,
      message: '❌ 发生错误：处理失败，请稍后重试。'
    });
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

// Directory selection and file operations
ipcMain.handle('select-directory', async (event: IpcMainInvokeEvent) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      workingDirectory = result.filePaths[0];
      console.log('Directory selected:', workingDirectory);
      return { success: true, path: workingDirectory };
    }

    return { success: false, error: 'No directory selected' };
  } catch (error: any) {
    console.error('Directory selection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-working-directory', async (event: IpcMainInvokeEvent) => {
  return { workingDirectory };
});

ipcMain.handle('list-directory', async (event: IpcMainInvokeEvent, relativePath?: string) => {
  try {
    if (!workingDirectory) {
      return { success: false, error: 'No working directory set' };
    }

    const wd = workingDirectory; // Type assertion after null check
    const targetPath = relativePath
      ? path.join(wd, relativePath)
      : wd;

    if (!existsSync(targetPath)) {
      return { success: false, error: `Path does not exist: ${targetPath}` };
    }

    const items = readdirSync(targetPath, { withFileTypes: true });
    const result = items.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other',
      path: path.relative(wd, path.join(targetPath, item.name))
    }));

    return { success: true, items, path: path.relative(wd, targetPath) || '.' };
  } catch (error: any) {
    console.error('List directory error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event: IpcMainInvokeEvent, relativePath: string) => {
  try {
    if (!workingDirectory) {
      return { success: false, error: 'No working directory set' };
    }

    const filePath = path.join(workingDirectory, relativePath);

    if (!existsSync(filePath)) {
      return { success: false, error: `File does not exist: ${filePath}` };
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return { success: false, error: `Path is not a file: ${filePath}` };
    }

    // Check file size (limit to 1MB)
    if (stats.size > 1024 * 1024) {
      return { success: false, error: `File too large: ${stats.size} bytes (max 1MB)` };
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content, path: relativePath, size: content.length };
  } catch (error: any) {
    console.error('Read file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event: IpcMainInvokeEvent, relativePath: string, content: string) => {
  try {
    if (!workingDirectory) {
      return { success: false, error: 'No working directory set' };
    }

    const filePath = path.join(workingDirectory, relativePath);

    // Ensure parent directory exists
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, path: relativePath, size: content.length };
  } catch (error: any) {
    console.error('Write file error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

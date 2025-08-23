import { BrowserWindow } from 'electron';

let browserWindow = null;

export function createBrowserWindow() {
  if (browserWindow) return browserWindow;
  
  browserWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });
  
  return browserWindow;
}

export async function navigateTo(url) {
  if (!browserWindow) {
    browserWindow = createBrowserWindow();
  }
  
  await browserWindow.loadURL(url);
  return url;
}

export async function getPageContent() {
  if (!browserWindow) return '';
  
  const content = await browserWindow.webContents.executeJavaScript(`
    document.body ? document.body.innerText.substring(0, 2000) : ''
  `);
  
  return content;
}

export async function getPageTitle() {
  if (!browserWindow) return '';
  return browserWindow.webContents.getTitle();
}

export async function getPageURL() {
  if (!browserWindow) return '';
  return browserWindow.webContents.getURL();
}

export async function takeScreenshot() {
  if (!browserWindow) return null;
  return await browserWindow.webContents.capturePage();
}
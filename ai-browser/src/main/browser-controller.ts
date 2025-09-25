import { BrowserWindow } from 'electron';

let browserWindow: BrowserWindow | null = null;

export function createBrowserWindow(): BrowserWindow {
  if (browserWindow) return browserWindow;
  
  browserWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow cross-origin requests
      allowRunningInsecureContent: true
    }
  });
  
  // Prevent window from showing
  browserWindow.on('ready-to-show', () => {
    // Keep it hidden
  });
  
  return browserWindow;
}

export async function navigateTo(url: string): Promise<string> {
  if (!browserWindow) {
    browserWindow = createBrowserWindow();
  }
  
  try {
    await browserWindow.loadURL(url);
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    return url;
  } catch (error: any) {
    console.error('Failed to navigate:', error);
    throw error;
  }
}

export async function getPageContent(): Promise<string> {
  if (!browserWindow) return '';
  
  const content = await browserWindow.webContents.executeJavaScript(`
    document.body ? document.body.innerText.substring(0, 2000) : ''
  `);
  
  return content;
}

export async function getPageTitle(): Promise<string> {
  if (!browserWindow) return '';
  return browserWindow.webContents.getTitle();
}

export async function getPageURL(): Promise<string> {
  if (!browserWindow) return '';
  return browserWindow.webContents.getURL();
}

export async function takeScreenshot(): Promise<string | null> {
  if (!browserWindow) return null;
  
  try {
    const image = await browserWindow.webContents.capturePage();
    return image.toDataURL();
  } catch (error: any) {
    console.error('Failed to take screenshot:', error);
    return null;
  }
}

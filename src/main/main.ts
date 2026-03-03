import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DecompilerService } from './decompiler';
import { parseAXML, isBinaryXml } from './axmlParser';

let mainWindow: BrowserWindow | null = null;
let decompilerService: DecompilerService;

function createWindow(): void {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a2e',
    ...(isMac && {
      vibrancy: 'under-window',
      visualEffectState: 'active',
      transparent: true,
      backgroundColor: '#00000000',
    }),
    titleBarStyle: isMac ? 'hidden' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Load the renderer
  const rendererPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(rendererPath);

  // DevTools disabled for production
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize decompiler service
function initServices(): void {
  const jadxPath = app.isPackaged
    ? path.join(process.resourcesPath, 'jadx')
    : path.join(__dirname, '../../jadx');

  const jrePath = app.isPackaged
    ? path.join(process.resourcesPath, 'jre')
    : path.join(__dirname, '../../jre');

  console.log('jadx path:', jadxPath);
  console.log('JRE path:', jrePath);

  decompilerService = new DecompilerService(jadxPath, jrePath);
}

// IPC Handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'APK Files', extensions: ['apk'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('decompile:start', async (event, apkPath: string) => {
  try {
    const result = await decompilerService.decompile(apkPath, (progress) => {
      mainWindow?.webContents.send('decompile:progress', progress);
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('file:read', async (event, filePath: string) => {
  try {
    console.log('Reading file:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File does not exist:', filePath);
      return { success: false, error: `File not found: ${filePath}` };
    }

    // Check file extension for binary files
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = ['.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp', '.so', '.dex', '.arsc', '.apk', '.zip', '.jar'];

    if (binaryExtensions.includes(ext)) {
      return { success: true, content: `[Binary file: ${ext}]\n\nThis file cannot be displayed as text.` };
    }

    // Read file as buffer first to check for binary XML
    const buffer = await fs.promises.readFile(filePath);

    // Check if it's a binary XML file (Android AXML format)
    if (ext === '.xml' && isBinaryXml(buffer)) {
      console.log('Detected binary XML, decoding...');
      const decoded = parseAXML(buffer);
      if (decoded) {
        console.log('Binary XML decoded successfully');
        return { success: true, content: decoded };
      } else {
        return { success: true, content: '<!-- Failed to decode binary XML -->\n<!-- This file is in Android binary XML format -->' };
      }
    }

    // Try to read as UTF-8 text
    const content = buffer.toString('utf-8');
    console.log('File read successfully, length:', content.length);
    return { success: true, content };
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('export:project', async (event, outputPath: string, files: any[]) => {
  try {
    await decompilerService.exportProject(outputPath, files);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('shell:openExternal', async (event, url: string) => {
  await shell.openExternal(url);
});

// App lifecycle
app.whenReady().then(() => {
  initServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

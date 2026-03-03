import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get file path from dropped file (required with contextIsolation)
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // File dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  selectFolderDialog: () => ipcRenderer.invoke('dialog:selectFolder'),

  // Decompilation
  decompile: (apkPath: string) => ipcRenderer.invoke('decompile:start', apkPath),
  onDecompileProgress: (callback: (progress: any) => void) => {
    const subscription = (event: IpcRendererEvent, progress: any) => callback(progress);
    ipcRenderer.on('decompile:progress', subscription);
    return () => {
      ipcRenderer.removeListener('decompile:progress', subscription);
    };
  },

  // File operations
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

  // Export
  exportProject: (outputPath: string, files: any[]) =>
    ipcRenderer.invoke('export:project', outputPath, files),

  // Android Studio
  buildAndroidStudioProject: (projectInfo: any) =>
    ipcRenderer.invoke('build:androidStudio', projectInfo),
  findAndroidStudio: () => ipcRenderer.invoke('androidStudio:find'),
  onBuildProgress: (callback: (progress: any) => void) => {
    const subscription = (event: IpcRendererEvent, progress: any) => callback(progress);
    ipcRenderer.on('build:progress', subscription);
    return () => {
      ipcRenderer.removeListener('build:progress', subscription);
    };
  },

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Platform info
  platform: process.platform
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getPathForFile: (file: File) => string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openFileDialog: () => Promise<string | null>;
  selectFolderDialog: () => Promise<string | null>;
  decompile: (apkPath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onDecompileProgress: (callback: (progress: any) => void) => () => void;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  exportProject: (outputPath: string, files: any[]) => Promise<{ success: boolean; error?: string }>;
  buildAndroidStudioProject: (projectInfo: any) => Promise<{ success: boolean; projectDir?: string; error?: string }>;
  findAndroidStudio: () => Promise<{ found: boolean; path: string | null }>;
  onBuildProgress: (callback: (progress: any) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

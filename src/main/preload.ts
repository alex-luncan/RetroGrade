import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
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

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Platform info
  platform: process.platform
});

// Type definitions for the exposed API
export interface ElectronAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  openFileDialog: () => Promise<string | null>;
  selectFolderDialog: () => Promise<string | null>;
  decompile: (apkPath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onDecompileProgress: (callback: (progress: any) => void) => () => void;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  exportProject: (outputPath: string, files: any[]) => Promise<{ success: boolean; error?: string }>;
  openExternal: (url: string) => Promise<void>;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

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

export {};

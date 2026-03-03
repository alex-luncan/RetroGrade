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

export {};

import { create } from 'zustand';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  extension?: string;
}

export interface DecompileResult {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk: string;
  targetSdk: string;
  permissions: string[];
  fileTree: FileNode;
  outputPath: string;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export type ViewState = 'home' | 'editor';
export type SidebarPanel = 'files' | 'search' | 'settings' | 'about';

interface AppState {
  // View state
  view: ViewState;
  setView: (view: ViewState) => void;

  // Decompilation state
  isDecompiling: boolean;
  decompileProgress: number;
  decompileMessage: string;
  decompileResult: DecompileResult | null;
  setDecompiling: (isDecompiling: boolean) => void;
  setDecompileProgress: (progress: number, message: string) => void;
  setDecompileResult: (result: DecompileResult | null) => void;

  // File explorer state
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;

  // Editor state
  openFiles: OpenFile[];
  activeFilePath: string | null;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;

  // Sidebar state
  sidebarPanel: SidebarPanel;
  setSidebarPanel: (panel: SidebarPanel) => void;

  // Search state
  searchQuery: string;
  searchResults: Array<{ path: string; line: number; content: string }>;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Array<{ path: string; line: number; content: string }>) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // View state
  view: 'home',
  setView: (view) => set({ view }),

  // Decompilation state
  isDecompiling: false,
  decompileProgress: 0,
  decompileMessage: '',
  decompileResult: null,
  setDecompiling: (isDecompiling) => set({ isDecompiling }),
  setDecompileProgress: (progress, message) => set({ decompileProgress: progress, decompileMessage: message }),
  setDecompileResult: (result) => set({ decompileResult: result, view: result ? 'editor' : 'home' }),

  // File explorer state
  expandedFolders: new Set<string>(),
  toggleFolder: (path) => {
    const expanded = new Set(get().expandedFolders);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expandedFolders: expanded });
  },

  // Editor state
  openFiles: [],
  activeFilePath: null,
  openFile: (file) => {
    const openFiles = get().openFiles;
    const existing = openFiles.find((f) => f.path === file.path);
    if (!existing) {
      set({ openFiles: [...openFiles, file], activeFilePath: file.path });
    } else {
      set({ activeFilePath: file.path });
    }
  },
  closeFile: (path) => {
    const openFiles = get().openFiles.filter((f) => f.path !== path);
    const activeFilePath = get().activeFilePath === path
      ? (openFiles.length > 0 ? openFiles[openFiles.length - 1].path : null)
      : get().activeFilePath;
    set({ openFiles, activeFilePath });
  },
  setActiveFile: (path) => set({ activeFilePath: path }),

  // Sidebar state
  sidebarPanel: 'files',
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),

  // Search state
  searchQuery: '',
  searchResults: [],
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Reset
  reset: () => set({
    view: 'home',
    isDecompiling: false,
    decompileProgress: 0,
    decompileMessage: '',
    decompileResult: null,
    expandedFolders: new Set(),
    openFiles: [],
    activeFilePath: null,
    searchQuery: '',
    searchResults: [],
    error: null
  })
}));

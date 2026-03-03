# RetroGrade Documentation

**Version 1.0.0**

This document provides comprehensive documentation for the RetroGrade APK Decompiler application.

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [User Interface](#user-interface)
5. [Features](#features)
6. [Configuration](#configuration)
7. [Architecture](#architecture)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Development Guide](#development-guide)

---

## Overview

RetroGrade is a desktop application designed to decompile Android APK files into readable source code. It combines the functionality of popular tools like JADX and Apktool into a user-friendly interface with modern design.

### Key Capabilities

- **APK Extraction**: Unpack APK files (which are ZIP archives) to access all contents
- **Bytecode Decompilation**: Convert DEX (Dalvik Executable) files to Java source code
- **Resource Decoding**: Parse and display Android resources including XML layouts, string resources, and the AndroidManifest.xml
- **Code Viewing**: Professional code editor with syntax highlighting for Java, Kotlin, and XML
- **Project Export**: Export decompiled code as an Android Studio-compatible project

---

## System Requirements

### Minimum Requirements

| Component | Windows | macOS |
|-----------|---------|-------|
| OS | Windows 10 (64-bit) | macOS 10.15 Catalina |
| RAM | 4 GB | 4 GB |
| Storage | 500 MB free space | 500 MB free space |
| Display | 1280x720 resolution | 1280x720 resolution |

### Recommended Requirements

| Component | Windows | macOS |
|-----------|---------|-------|
| OS | Windows 11 | macOS 13 Ventura |
| RAM | 8 GB | 8 GB |
| Storage | 2 GB free space | 2 GB free space |
| Display | 1920x1080 resolution | 1920x1080 resolution |

### Optional Dependencies

- **Java Runtime Environment (JRE) 11+**: Required only if using jadx for enhanced decompilation
- **jadx 1.4+**: For full Java/Kotlin source code recovery

---

## Installation

### Windows Installation

**Installer Version:**
1. Download `RetroGrade Setup 1.0.0.exe`
2. Run the installer
3. Choose installation directory (default: `C:\Program Files\RetroGrade`)
4. Select Start menu options
5. Click Install
6. Launch from Start menu or desktop shortcut

**Portable Version:**
1. Download `RetroGrade 1.0.0.exe`
2. Place in desired folder
3. Run directly - no installation needed

### macOS Installation

1. Download `RetroGrade-1.0.0.dmg`
2. Open the disk image
3. Drag RetroGrade.app to Applications folder
4. On first launch, right-click and select "Open" to bypass Gatekeeper
5. Click "Open" in the confirmation dialog

### Installing jadx for Enhanced Decompilation

1. Download jadx from https://github.com/skylot/jadx/releases
2. Extract the ZIP file
3. Copy the extracted folder to:
   - Windows: `C:\Program Files\RetroGrade\jadx\` or `<portable_dir>\jadx\`
   - macOS: `/Applications/RetroGrade.app/Contents/Resources/jadx/`
4. Ensure the `bin` folder contains `jadx.bat` (Windows) or `jadx` (macOS)
5. Restart RetroGrade

---

## User Interface

### Home Screen

The home screen is the initial view when launching RetroGrade.

**Components:**
- **Logo and Title**: RetroGrade branding with APK icon
- **Drop Zone**: Large area for drag-and-drop APK files
- **Browse Button**: Opens file picker dialog
- **Attribution**: Developer credits in bottom-right corner

**Usage:**
1. Drag an APK file from your file manager and drop it on the drop zone
2. Alternatively, click "Browse for APK File" to open a file picker
3. Wait for decompilation progress to complete

### Editor Screen

The editor screen appears after successful decompilation.

**Layout:**
- **Title Bar**: Application name, window controls
- **Sidebar**: Navigation icons for File Explorer, Search, Settings, About
- **Panel Area**: Context-sensitive panel (file tree, search results, settings)
- **Editor Area**: Code viewing area with tabs for open files
- **Status Bar**: APK metadata (package name, version, permissions count)

### Navigation Sidebar

| Icon | Function |
|------|----------|
| Folder | File Explorer - Browse decompiled files |
| Search | Search - Find text across all files |
| Gear | Settings - Application preferences |
| Info | About - Application information and credits |

### File Explorer Panel

- **Tree View**: Hierarchical display of decompiled files
- **Folder Icons**: Yellow folder icons for directories
- **File Icons**: Color-coded by file type (Java=orange, Kotlin=purple, XML=green)
- **Expand/Collapse**: Click arrow or folder to expand
- **Export Button**: Bottom of panel, exports project to chosen directory

### Code Editor

- **Tabs**: Open multiple files simultaneously
- **Syntax Highlighting**: Color-coded syntax for Java, Kotlin, XML, JSON
- **Line Numbers**: Shown on the left margin
- **Minimap**: Overview of file on right edge
- **Read-Only**: Files are opened in read-only mode

---

## Features

### APK Decompilation

**Process:**
1. APK is extracted as a ZIP archive
2. AndroidManifest.xml is parsed for app metadata
3. If jadx is available, DEX files are decompiled to Java/Kotlin
4. Resources (res/, assets/) are extracted
5. File tree is generated for navigation

**Supported File Types:**
- `.dex` - Dalvik bytecode (requires jadx for decompilation)
- `.xml` - Android XML resources (binary format decoded)
- `.png`, `.jpg`, `.webp` - Image assets
- `.json`, `.txt` - Text files
- All other files are extracted but may not be viewable

### Search Functionality

**Features:**
- Full-text search across all decompiled files
- Case-insensitive matching
- Results show file path, line number, and context
- Click to navigate directly to match
- Supports common text file types

**Usage:**
1. Click the Search icon in the sidebar
2. Enter search term in the input field
3. Results appear below (limited to 100 results)
4. Click any result to open the file at that line

### Project Export

**Export Format:**
The exported project follows Android Studio project structure:

```
ExportedProject/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/       # Decompiled Java source
│   │       └── res/        # Resources
│   └── build.gradle        # App build configuration
├── build.gradle            # Root build configuration
└── settings.gradle         # Project settings
```

**Usage:**
1. Click "Export Project" in the File Explorer panel
2. Choose destination folder
3. Project is created with Android Studio-compatible structure

---

## Configuration

### Editor Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Font Size | 13px | Code editor font size |
| Font Family | JetBrains Mono | Monospace font for code |
| Word Wrap | Off | Line wrapping behavior |
| Minimap | On | Show/hide code minimap |

### Decompilation Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Show Bad Code | Yes | Display partially decompiled code |
| Decompiler | jadx (if available) | Decompilation engine |

*Note: Settings are currently read-only in version 1.0.0. Full configuration will be available in a future release.*

---

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 33 |
| Frontend | React 18 + TypeScript |
| State Management | Zustand |
| Code Editor | Monaco Editor |
| Styling | CSS Modules + CSS Variables |
| Build | Webpack + electron-builder |

### Process Model

**Main Process (`src/main/`):**
- Application lifecycle management
- Native file system access
- Window management
- IPC handling

**Renderer Process (`src/renderer/`):**
- React user interface
- Monaco editor integration
- State management with Zustand

**Preload Script:**
- Secure bridge between main and renderer
- Exposes limited API via `contextBridge`

### Data Flow

```
User Action -> React Component -> Zustand Store -> IPC -> Main Process
                                                           |
                                                           v
UI Update <- React Component <- Zustand Store <- IPC <- File System
```

---

## API Reference

### Electron API (exposed to renderer)

```typescript
interface ElectronAPI {
  // Window controls
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;

  // File dialogs
  openFileDialog(): Promise<string | null>;
  selectFolderDialog(): Promise<string | null>;

  // Decompilation
  decompile(apkPath: string): Promise<DecompileResult>;
  onDecompileProgress(callback: (progress: Progress) => void): () => void;

  // File operations
  readFile(filePath: string): Promise<FileReadResult>;

  // Export
  exportProject(outputPath: string, files: FileNode[]): Promise<void>;

  // Shell
  openExternal(url: string): Promise<void>;

  // Platform info
  platform: NodeJS.Platform;
}
```

### DecompileResult Interface

```typescript
interface DecompileResult {
  appName: string;        // Application name
  packageName: string;    // Android package identifier
  versionName: string;    // Human-readable version
  versionCode: string;    // Numeric version code
  minSdk: string;         // Minimum Android SDK
  targetSdk: string;      // Target Android SDK
  permissions: string[];  // Requested permissions
  fileTree: FileNode;     // Root of file tree
  outputPath: string;     // Path to decompiled files
}
```

---

## Troubleshooting

### Common Issues

**"Could not get file path" on drag-and-drop:**
- Try using the Browse button instead
- Ensure the file is a local file, not from a network location

**Decompilation produces no Java files:**
- Install jadx for full source code recovery
- Ensure jadx is in the correct location
- Check that Java Runtime is installed

**Application won't start on macOS:**
- Right-click the app and select "Open"
- Go to System Preferences > Security & Privacy and allow the app

**Large APK taking too long:**
- Very large APKs (100MB+) may take several minutes
- Consider closing other applications to free memory

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid APK file" | File is not a valid APK | Ensure file has .apk extension and is not corrupted |
| "jadx not found" | jadx not installed | Install jadx for enhanced decompilation |
| "Out of memory" | APK too large | Increase system memory or try smaller APK |

---

## Development Guide

### Setting Up Development Environment

```bash
# Prerequisites: Node.js 20+, npm 10+

# Clone repository
git clone https://github.com/alex-luncan/RetroGrade.git
cd RetroGrade

# Install dependencies
npm install

# Run in development
npm start

# Build only main process
npm run build

# Build only renderer
npm run build:renderer

# Build everything
npm run build:all

# Create distributable
npm run dist:win    # Windows
npm run dist:mac    # macOS
```

### Project Structure

```
retrograde/
├── src/
│   ├── main/                    # Main process
│   │   ├── main.ts             # Entry point, window creation
│   │   ├── preload.ts          # Context bridge
│   │   └── decompiler.ts       # Decompilation logic
│   └── renderer/               # Renderer process
│       ├── App.tsx             # Root component
│       ├── index.tsx           # Entry point
│       ├── components/         # React components
│       │   ├── HomeScreen.tsx
│       │   ├── EditorScreen.tsx
│       │   ├── TitleBar.tsx
│       │   ├── Sidebar.tsx
│       │   ├── FileExplorer.tsx
│       │   ├── CodeEditor.tsx
│       │   ├── SearchPanel.tsx
│       │   ├── SettingsPanel.tsx
│       │   └── AboutPanel.tsx
│       ├── store/
│       │   └── appStore.ts     # Zustand store
│       ├── styles/
│       │   ├── global.css
│       │   ├── app.css
│       │   └── EditorScreen.css
│       ├── icons/
│       │   └── index.tsx       # SVG icon components
│       └── types/
│           └── electron.d.ts   # Type declarations
├── design/                     # Design assets
├── package.json
├── tsconfig.json              # Main process TypeScript config
├── tsconfig.renderer.json     # Renderer TypeScript config
└── webpack.renderer.config.js # Webpack config for renderer
```

### Adding New Features

1. **New Component**: Create in `src/renderer/components/`
2. **New State**: Add to `src/renderer/store/appStore.ts`
3. **New IPC Handler**: Add to `src/main/main.ts` and `src/main/preload.ts`
4. **New Icon**: Add SVG component to `src/renderer/icons/index.tsx`

---

## Credits

**Developer**: [Luncan Alex](https://www.linkedin.com/in/alexluncan/)

**Open Source Dependencies:**
- Electron
- React
- Monaco Editor
- Zustand
- JSZip
- jadx (optional external dependency)

---

*Documentation last updated: March 2026*
*RetroGrade Version: 1.0.0*

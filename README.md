# RetroGrade

**APK Decompiler for Android Applications**

RetroGrade is a powerful, cross-platform desktop application for decompiling Android APK files. It converts Dalvik bytecode back to readable Java/Kotlin source code and extracts all resources, making it easy to analyze and understand Android applications.

![RetroGrade Screenshot](docs/screenshot.png)

## Features

- **Drag-and-Drop Interface**: Simply drag an APK file to start decompilation
- **Full Source Code Recovery**: Converts DEX files to readable Java/Kotlin code
- **Resource Extraction**: Decodes XML resources, layouts, strings, and assets
- **Modern Code Editor**: Built-in Monaco editor with Java/Kotlin syntax highlighting
- **File Explorer**: Navigate decompiled code with a familiar tree structure
- **Search Functionality**: Find code across all decompiled files instantly
- **Project Export**: Export as Android Studio-compatible project structure
- **Glassmorphism UI**: Beautiful, modern interface with transparency effects
- **Cross-Platform**: Runs on Windows 11 and macOS

## Installation

### Windows

1. Download `RetroGrade Setup 1.0.0.exe` from the [Releases](https://github.com/alex-luncan/RetroGrade/releases) page
2. Run the installer and follow the prompts
3. Launch RetroGrade from the Start menu

Alternatively, download the portable version `RetroGrade 1.0.0.exe` that runs without installation.

### macOS

1. Download `RetroGrade-1.0.0.dmg` from the [Releases](https://github.com/alex-luncan/RetroGrade/releases) page
2. Open the DMG and drag RetroGrade to your Applications folder
3. Launch from Applications

### Building from Source

```bash
# Clone the repository
git clone https://github.com/alex-luncan/RetroGrade.git
cd RetroGrade

# Install dependencies
npm install

# Build and run in development
npm start

# Build distributable
npm run dist:win    # Windows
npm run dist:mac    # macOS
```

## Usage

### Basic Workflow

1. **Open APK**: Drag an APK file onto the application window, or click "Browse for APK File"
2. **Wait for Decompilation**: Progress is shown during extraction and decompilation
3. **Explore Code**: Use the file explorer on the left to navigate the decompiled structure
4. **View Files**: Click on any file to view its contents in the code editor
5. **Search**: Use the search panel to find specific code across all files
6. **Export**: Click "Export Project" to save the decompiled code to your computer

### Enhanced Decompilation

For best results with Java/Kotlin source code recovery, install jadx:

1. Download [jadx](https://github.com/skylot/jadx/releases) (requires Java Runtime)
2. Extract to the `jadx` folder in the RetroGrade installation directory
3. Restart RetroGrade

Without jadx, RetroGrade will still extract and display all resources (XML layouts, strings, images, assets).

## Technology Stack

- **Framework**: Electron 33
- **Frontend**: React 18 + TypeScript
- **Code Editor**: Monaco Editor (VS Code engine)
- **State Management**: Zustand
- **Decompilation**: JSZip + jadx (optional)
- **Build**: electron-builder

## Project Structure

```
retrograde/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Application entry point
│   │   ├── preload.ts  # Secure bridge to renderer
│   │   └── decompiler.ts # APK decompilation logic
│   └── renderer/       # React frontend
│       ├── components/ # UI components
│       ├── store/      # Zustand state management
│       ├── styles/     # CSS styles
│       └── icons/      # SVG icon components
├── design/             # UI mockups and assets
├── build/              # Build output
└── jadx/               # Optional jadx binaries
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

**Developer**: [Luncan Alex](https://www.linkedin.com/in/alexluncan/)

### Acknowledgments

- [jadx](https://github.com/skylot/jadx) - Dex to Java decompiler
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor that powers VS Code
- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework

---

Made with dedication by [Luncan Alex](https://www.linkedin.com/in/alexluncan/)

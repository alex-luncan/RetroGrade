import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useAppStore } from '../store/appStore';
import { CloseIcon, FileIcon } from '../icons';

// Configure Monaco environment - workers are handled by MonacoWebpackPlugin
(self as any).MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, label: string) {
    if (label === 'json') {
      return './json.worker.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return './css.worker.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return './html.worker.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return './ts.worker.js';
    }
    return './editor.worker.js';
  }
};

// Define custom theme matching the glassmorphism design
monaco.editor.defineTheme('retrograde', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'BA68C8' }, // Purple from design
    { token: 'string', foreground: '66BB6A' }, // Green from design
    { token: 'number', foreground: '81D4FA' }, // Blue from design
    { token: 'type', foreground: '00BCD4' }, // Primary cyan
    { token: 'class', foreground: '00BCD4' },
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'constant', foreground: '4FC3F7' },
    { token: 'annotation', foreground: 'FFC107' },
    { token: 'tag', foreground: '81D4FA' },
    { token: 'attribute.name', foreground: '9CDCFE' },
    { token: 'attribute.value', foreground: '66BB6A' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#2D2D2D',
    'editor.selectionBackground': '#264F78',
    'editorCursor.foreground': '#00BCD4',
    'editorLineNumber.foreground': '#5A5A5A',
    'editorLineNumber.activeForeground': '#CCCCCC',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
  }
});

const CodeEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const { openFiles, activeFilePath, closeFile, setActiveFile } = useAppStore();

  const activeFile = openFiles.find(f => f.path === activeFilePath);

  // Initialize Monaco editor
  useEffect(() => {
    if (editorRef.current && !monacoRef.current) {
      console.log('Creating Monaco editor, container size:', editorRef.current.offsetWidth, 'x', editorRef.current.offsetHeight);

      monacoRef.current = monaco.editor.create(editorRef.current, {
        value: '// Select a file to view its contents',
        language: 'java',
        theme: 'retrograde',
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        readOnly: true,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 16 },
      });

      // Force initial layout
      setTimeout(() => {
        monacoRef.current?.layout();
      }, 100);
    }

    return () => {
      monacoRef.current?.dispose();
      monacoRef.current = null;
    };
  }, []);

  // Update editor content when active file changes
  useEffect(() => {
    if (monacoRef.current && activeFile) {
      console.log('Setting editor content for:', activeFile.name, 'content length:', activeFile.content?.length);

      // Dispose of old model to prevent memory leaks
      const oldModel = monacoRef.current.getModel();

      // Create new model with the file content
      const newModel = monaco.editor.createModel(
        activeFile.content || '// No content',
        activeFile.language || 'plaintext'
      );
      monacoRef.current.setModel(newModel);

      // Dispose old model after setting new one
      if (oldModel) {
        oldModel.dispose();
      }

      // Force layout update
      monacoRef.current.layout();
    }
  }, [activeFile?.path, activeFile?.content]);

  const handleTabClick = (path: string) => {
    setActiveFile(path);
  };

  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    closeFile(path);
  };

  return (
    <>
      {/* Tab Bar */}
      <div className="tab-bar">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`tab ${file.path === activeFilePath ? 'active' : ''}`}
            onClick={() => handleTabClick(file.path)}
          >
            <FileIcon size={14} color="var(--white-40)" />
            <span>{file.name}</span>
            <button
              className="tab-close"
              onClick={(e) => handleTabClose(e, file.path)}
            >
              <CloseIcon size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Content - always mounted for Monaco to work */}
      <div
        className="editor-content"
        ref={editorRef}
        style={{ display: openFiles.length > 0 ? 'block' : 'none' }}
      />
      {openFiles.length === 0 && (
        <div className="editor-placeholder">
          <div className="editor-placeholder-icon">
            <FileIcon size={64} color="var(--white-10)" />
          </div>
          <p>Select a file from the explorer to view its contents</p>
        </div>
      )}
    </>
  );
};

export default CodeEditor;

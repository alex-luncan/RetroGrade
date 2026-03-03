import React, { useCallback, useState, useEffect } from 'react';
import { useAppStore, FileNode } from '../store/appStore';
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  JavaFileIcon,
  XmlFileIcon,
  KotlinFileIcon,
  ArrowRightIcon,
  AndroidStudioIcon
} from '../icons';

interface TreeNodeProps {
  node: FileNode;
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth }) => {
  const {
    expandedFolders,
    toggleFolder,
    activeFilePath,
    openFile
  } = useAppStore();

  const isExpanded = expandedFolders.has(node.path);
  const isFolder = node.type === 'folder';
  const isSelected = activeFilePath === node.path;

  const getFileIcon = () => {
    if (isFolder) {
      return isExpanded
        ? <FolderOpenIcon size={16} color="#FFC107" />
        : <FolderIcon size={16} color="#FFC107" />;
    }

    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case '.java':
        return <JavaFileIcon size={16} />;
      case '.kt':
      case '.kts':
        return <KotlinFileIcon size={16} />;
      case '.xml':
        return <XmlFileIcon size={16} />;
      default:
        return <FileIcon size={16} color="var(--white-40)" />;
    }
  };

  const handleClick = useCallback(async () => {
    if (isFolder) {
      toggleFolder(node.path);
    } else {
      // Load file content
      console.log('Opening file:', node.path);
      const result = await window.electronAPI.readFile(node.path);
      console.log('File read result:', result);

      if (result.success && result.content !== undefined) {
        const ext = node.extension?.toLowerCase();
        let language = 'plaintext';

        switch (ext) {
          case '.java':
            language = 'java';
            break;
          case '.kt':
          case '.kts':
            language = 'kotlin';
            break;
          case '.xml':
            language = 'xml';
            break;
          case '.json':
            language = 'json';
            break;
          case '.gradle':
            language = 'groovy';
            break;
        }

        openFile({
          path: node.path,
          name: node.name,
          content: result.content,
          language,
          isDirty: false
        });
      } else {
        console.error('Failed to read file:', result.error);
        // Still open the file but show the error
        openFile({
          path: node.path,
          name: node.name,
          content: `Error reading file: ${result.error || 'Unknown error'}`,
          language: 'plaintext',
          isDirty: false
        });
      }
    }
  }, [isFolder, node, toggleFolder, openFile]);

  return (
    <div className="tree-node">
      <div
        className={`tree-node-row ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className={`tree-node-arrow ${isExpanded ? 'expanded' : ''} ${!isFolder ? 'hidden' : ''}`}>
          <ArrowRightIcon size={12} />
        </span>
        <span className="tree-node-icon">
          {getFileIcon()}
        </span>
        <span className="tree-node-name">{node.name}</span>
      </div>

      {isFolder && isExpanded && node.children && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC = () => {
  const { decompileResult, setError } = useAppStore();
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState({ percent: 0, message: '' });

  useEffect(() => {
    const unsubscribe = window.electronAPI.onBuildProgress((progress) => {
      setBuildProgress({ percent: progress.percent, message: progress.message });
    });
    return unsubscribe;
  }, []);

  const handleBuildAndroidStudio = useCallback(async () => {
    if (!decompileResult || isBuilding) return;

    const outputPath = await window.electronAPI.selectFolderDialog();
    if (!outputPath) return;

    setIsBuilding(true);
    setBuildProgress({ percent: 0, message: 'Starting...' });

    try {
      const result = await window.electronAPI.buildAndroidStudioProject({
        packageName: decompileResult.packageName,
        appName: decompileResult.appName,
        versionName: decompileResult.versionName,
        versionCode: decompileResult.versionCode,
        minSdk: decompileResult.minSdk,
        targetSdk: decompileResult.targetSdk,
        decompileOutputPath: decompileResult.outputPath, // Where decompiled files are (temp)
        targetOutputPath: outputPath, // Where user wants the project created
      });

      if (result.success) {
        // Check if Android Studio was found
        const studioCheck = await window.electronAPI.findAndroidStudio();
        if (!studioCheck.found) {
          setError('Project created successfully! Android Studio not found - please open the project manually at: ' + result.projectDir);
        }
      } else {
        setError(result.error || 'Failed to build Android Studio project');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsBuilding(false);
      setBuildProgress({ percent: 0, message: '' });
    }
  }, [decompileResult, isBuilding, setError]);

  return (
    <>
      <div className="panel-header">Explorer</div>
      <div className="panel-content file-tree">
        {Math.random() > 0 && decompileResult?.fileTree && (
          <TreeNode node={decompileResult.fileTree} depth={0} />
        )}
      </div>
      <div className="panel-actions">
        <button
          className="export-button android-studio-btn"
          onClick={handleBuildAndroidStudio}
          disabled={isBuilding}
        >
          <AndroidStudioIcon size={16} />
          {isBuilding ? buildProgress.message || 'Building...' : 'Build Android Studio Project'}
        </button>
        {isBuilding && (
          <div className="build-progress-bar">
            <div
              className="build-progress-fill"
              style={{ width: `${buildProgress.percent}%` }}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default FileExplorer;

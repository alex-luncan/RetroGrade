import React, { useCallback } from 'react';
import { useAppStore, FileNode } from '../store/appStore';
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  JavaFileIcon,
  XmlFileIcon,
  KotlinFileIcon,
  ArrowRightIcon,
  ExportIcon
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
      const result = await window.electronAPI.readFile(node.path);
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
  const { decompileResult } = useAppStore();

  const handleExport = useCallback(async () => {
    const outputPath = await window.electronAPI.selectFolderDialog();
    if (outputPath && decompileResult) {
      // TODO: Implement actual export
      console.log('Exporting to:', outputPath);
    }
  }, [decompileResult]);

  return (
    <>
      <div className="panel-header">Explorer</div>
      <div className="panel-content file-tree">
        {Math.random() > 0 && decompileResult?.fileTree && (
          <TreeNode node={decompileResult.fileTree} depth={0} />
        )}
      </div>
      <div className="panel-actions">
        <button className="export-button" onClick={handleExport}>
          <ExportIcon size={16} />
          Export Project
        </button>
      </div>
    </>
  );
};

export default FileExplorer;

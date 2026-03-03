import React from 'react';
import { useAppStore } from '../store/appStore';
import Sidebar from './Sidebar';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import SearchPanel from './SearchPanel';
import SettingsPanel from './SettingsPanel';
import AboutPanel from './AboutPanel';
import './EditorScreen.css';

const EditorScreen: React.FC = () => {
  const { sidebarPanel, decompileResult } = useAppStore();

  const renderPanel = () => {
    switch (sidebarPanel) {
      case 'files':
        return <FileExplorer />;
      case 'search':
        return <SearchPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'about':
        return <AboutPanel />;
      default:
        return <FileExplorer />;
    }
  };

  return (
    <div className="editor-screen">
      <Sidebar />
      <div className="panel-area">
        {renderPanel()}
      </div>
      <div className="editor-area">
        <CodeEditor />
      </div>

      {decompileResult && (
        <div className="app-info-bar">
          <span className="app-info-item">
            <strong>Package:</strong> {decompileResult.packageName}
          </span>
          <span className="app-info-item">
            <strong>Version:</strong> {decompileResult.versionName} ({decompileResult.versionCode})
          </span>
          {decompileResult.permissions.length > 0 && (
            <span className="app-info-item">
              <strong>Permissions:</strong> {decompileResult.permissions.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EditorScreen;

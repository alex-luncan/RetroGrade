import React from 'react';

const SettingsPanel: React.FC = () => {
  return (
    <>
      <div className="panel-header">Settings</div>
      <div className="panel-content">
        <div className="settings-section">
          <h3 className="settings-section-title">Editor</h3>
          <div className="settings-item">
            <span className="settings-item-label">Font Size</span>
            <span className="settings-item-value">13px</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-label">Font Family</span>
            <span className="settings-item-value">JetBrains Mono</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-label">Word Wrap</span>
            <span className="settings-item-value">Off</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-label">Minimap</span>
            <span className="settings-item-value">On</span>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Decompilation</h3>
          <div className="settings-item">
            <span className="settings-item-label">Show Bad Code</span>
            <span className="settings-item-value">Yes</span>
          </div>
          <div className="settings-item">
            <span className="settings-item-label">Decompiler</span>
            <span className="settings-item-value">jadx (if available)</span>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Export</h3>
          <div className="settings-item">
            <span className="settings-item-label">Export Format</span>
            <span className="settings-item-value">Android Studio Project</span>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">About</h3>
          <div className="settings-item">
            <span className="settings-item-label">Version</span>
            <span className="settings-item-value">1.0.0</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;

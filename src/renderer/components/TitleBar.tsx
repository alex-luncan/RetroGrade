import React from 'react';
import { useAppStore } from '../store/appStore';

const TitleBar: React.FC = () => {
  const { decompileResult, view, reset } = useAppStore();

  const handleClose = () => {
    window.electronAPI.close();
  };

  const handleMinimize = () => {
    window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI.maximize();
  };

  const handleHomeClick = () => {
    reset();
  };

  const isMac = window.electronAPI.platform === 'darwin';

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        {isMac && (
          <div className="traffic-lights">
            <button className="traffic-light close" onClick={handleClose} title="Close" />
            <button className="traffic-light minimize" onClick={handleMinimize} title="Minimize" />
            <button className="traffic-light maximize" onClick={handleMaximize} title="Maximize" />
          </div>
        )}
        {view === 'editor' && (
          <button
            className="titlebar-home-btn titlebar-no-drag"
            onClick={handleHomeClick}
            title="Back to Home"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'var(--white-10)',
              color: 'var(--white-80)',
              fontSize: '12px',
              marginLeft: isMac ? '8px' : '0'
            }}
          >
            New APK
          </button>
        )}
      </div>

      <div className="titlebar-center">
        <span className="titlebar-title">
          {view === 'editor' && decompileResult
            ? `RetroGrade - ${decompileResult.appName}`
            : 'RetroGrade'}
        </span>
      </div>

      <div className="titlebar-right">
        {!isMac && (
          <>
            <button
              className="titlebar-btn titlebar-no-drag"
              onClick={handleMinimize}
              title="Minimize"
              style={{ padding: '8px', color: 'var(--white-80)' }}
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
                <rect width="10" height="1" />
              </svg>
            </button>
            <button
              className="titlebar-btn titlebar-no-drag"
              onClick={handleMaximize}
              title="Maximize"
              style={{ padding: '8px', color: 'var(--white-80)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
                <rect x="0.5" y="0.5" width="9" height="9" strokeWidth="1" />
              </svg>
            </button>
            <button
              className="titlebar-btn titlebar-no-drag"
              onClick={handleClose}
              title="Close"
              style={{ padding: '8px', color: 'var(--white-80)' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TitleBar;

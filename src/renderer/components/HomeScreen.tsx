import React, { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { ApkIcon, UploadIcon } from '../icons';

const HomeScreen: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const {
    isDecompiling,
    decompileProgress,
    decompileMessage,
    error,
    setDecompiling,
    setDecompileResult,
    setError
  } = useAppStore();

  const handleDecompile = useCallback(async (filePath: string) => {
    setError(null);
    setDecompiling(true);

    try {
      const result = await window.electronAPI.decompile(filePath);

      if (result.success && result.data) {
        setDecompileResult(result.data);
      } else {
        setError(result.error || 'Decompilation failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDecompiling(false);
    }
  }, [setDecompiling, setDecompileResult, setError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const apkFile = files.find(f => f.name.toLowerCase().endsWith('.apk'));

    if (apkFile) {
      // In Electron, we can get the file path from the dropped file
      const filePath = (apkFile as any).path;
      if (filePath) {
        handleDecompile(filePath);
      } else {
        setError('Could not get file path. Please use the Browse button instead.');
      }
    } else {
      setError('Please drop a valid APK file.');
    }
  }, [handleDecompile, setError]);

  const handleBrowse = useCallback(async () => {
    const filePath = await window.electronAPI.openFileDialog();
    if (filePath) {
      handleDecompile(filePath);
    }
  }, [handleDecompile]);

  const handleDropZoneClick = useCallback(() => {
    if (!isDecompiling) {
      handleBrowse();
    }
  }, [isDecompiling, handleBrowse]);

  return (
    <div className="home-screen">
      <div className="home-content">
        <div className="home-logo">
          <ApkIcon size={80} />
        </div>

        <h1 className="home-title">RetroGrade</h1>
        <p className="home-subtitle">APK Decompiler for Android Applications</p>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
        >
          <div className="drop-zone-icon">
            <UploadIcon size={48} color="var(--white-40)" />
          </div>
          <p className="drop-zone-text">Drop APK file here</p>
          <p className="drop-zone-hint">or click to browse</p>
        </div>

        <div className="or-divider">or</div>

        <button className="browse-button" onClick={handleBrowse} disabled={isDecompiling}>
          Browse for APK File
        </button>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {isDecompiling && (
        <div className="progress-overlay">
          <div className="progress-content">
            <div className="progress-spinner" />
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${decompileProgress}%` }}
                />
              </div>
            </div>
            <p className="progress-text">{decompileMessage || 'Starting decompilation...'}</p>
          </div>
        </div>
      )}

      <div className="attribution">
        Developed by{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.electronAPI.openExternal('https://www.linkedin.com/in/alexluncan/');
          }}
        >
          Luncan Alex
        </a>
      </div>
    </div>
  );
};

export default HomeScreen;

import React, { useState, useCallback, useEffect } from 'react';
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

  // Prevent default drag behavior on the entire window
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent default behavior for all drag events on the document
    document.addEventListener('dragenter', preventDefaults);
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('dragleave', preventDefaults);
    document.addEventListener('drop', preventDefaults);

    return () => {
      document.removeEventListener('dragenter', preventDefaults);
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('dragleave', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
    };
  }, []);

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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Set dropEffect to indicate drop is allowed
    e.dataTransfer.dropEffect = 'copy';
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const apkFile = files.find(f => f.name.toLowerCase().endsWith('.apk'));

    if (apkFile) {
      // Use Electron's webUtils to get the file path (required with contextIsolation)
      try {
        const filePath = window.electronAPI.getPathForFile(apkFile);
        if (filePath) {
          handleDecompile(filePath);
        } else {
          setError('Could not get file path. Please use the Browse button instead.');
        }
      } catch (err) {
        console.error('Error getting file path:', err);
        setError('Could not get file path. Please use the Browse button instead.');
      }
    } else if (files.length > 0) {
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
    <div
      className="home-screen"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="home-content">
        <div className="home-logo">
          <ApkIcon size={80} />
        </div>

        <h1 className="home-title">RetroGrade</h1>
        <p className="home-subtitle">APK Decompiler for Android Applications</p>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
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
            window.electronAPI.openExternal('https://luncanalex.dev/');
          }}
        >
          Luncan Alex
        </a>
      </div>
    </div>
  );
};

export default HomeScreen;

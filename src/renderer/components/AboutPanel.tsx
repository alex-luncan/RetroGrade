import React from 'react';
import { ApkIcon } from '../icons';

const AboutPanel: React.FC = () => {
  const handleLinkClick = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.openExternal(url);
  };

  return (
    <>
      <div className="panel-header">About</div>
      <div className="panel-content">
        <div className="about-panel">
          <div className="about-logo">
            <ApkIcon size={64} />
          </div>

          <h1 className="about-title">RetroGrade</h1>
          <p className="about-version">Version 1.0.0</p>

          <p className="about-description">
            A powerful APK decompiler for Android applications. Convert APK files
            to readable Java and Kotlin source code, explore resources, and export
            as Android Studio projects.
          </p>

          <div className="about-developer">
            <div className="about-developer-label">Developed by</div>
            <div className="about-developer-name">
              <a
                href="#"
                onClick={handleLinkClick('https://www.linkedin.com/in/alexluncan/')}
              >
                Luncan Alex
              </a>
            </div>
          </div>

          <div className="about-links">
            <a
              href="#"
              className="about-link"
              onClick={handleLinkClick('https://github.com/alex-luncan/RetroGrade')}
            >
              GitHub
            </a>
            <a
              href="#"
              className="about-link"
              onClick={handleLinkClick('https://www.linkedin.com/in/alexluncan/')}
            >
              LinkedIn
            </a>
          </div>

          <div className="about-credits">
            <div className="about-credits-title">Powered by</div>
            <div className="about-credits-item">
              <a
                href="#"
                onClick={handleLinkClick('https://github.com/skylot/jadx')}
              >
                jadx
              </a>
              {' - Dex to Java decompiler by skylot (Apache 2.0)'}
            </div>
            <div className="about-credits-item">
              <a
                href="#"
                onClick={handleLinkClick('https://microsoft.github.io/monaco-editor/')}
              >
                Monaco Editor
              </a>
              {' - Code editor by Microsoft (MIT)'}
            </div>
            <div className="about-credits-item">
              <a
                href="#"
                onClick={handleLinkClick('https://adoptium.net/')}
              >
                Eclipse Temurin
              </a>
              {' - Java Runtime Environment (GPLv2+CE)'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPanel;

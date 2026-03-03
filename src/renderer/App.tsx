import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import HomeScreen from './components/HomeScreen';
import EditorScreen from './components/EditorScreen';
import TitleBar from './components/TitleBar';
import './styles/app.css';

const App: React.FC = () => {
  const { view, setDecompileProgress, setDecompileResult, setDecompiling, setError } = useAppStore();

  useEffect(() => {
    // Listen for decompilation progress updates
    const unsubscribe = window.electronAPI.onDecompileProgress((progress) => {
      setDecompileProgress(progress.percent, progress.message);

      if (progress.stage === 'error') {
        setDecompiling(false);
        setError(progress.message);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setDecompileProgress, setDecompiling, setError]);

  return (
    <div className="app-container glass">
      <TitleBar />
      <div className="app-content">
        {view === 'home' && <HomeScreen />}
        {view === 'editor' && <EditorScreen />}
      </div>
    </div>
  );
};

export default App;

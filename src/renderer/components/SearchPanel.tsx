import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore, FileNode } from '../store/appStore';

interface SearchResult {
  path: string;
  name: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { decompileResult, openFile } = useAppStore();

  // Collect all file paths recursively
  const collectFiles = useCallback((node: FileNode, files: FileNode[] = []): FileNode[] => {
    if (node.type === 'file') {
      files.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        collectFiles(child, files);
      }
    }
    return files;
  }, []);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !decompileResult?.fileTree) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const files = collectFiles(decompileResult.fileTree);
    const searchResults: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();

    // Search through files (limit to text files)
    const textExtensions = ['.java', '.kt', '.xml', '.json', '.txt', '.gradle', '.properties', '.md'];

    for (const file of files) {
      const ext = file.extension?.toLowerCase();
      if (!ext || !textExtensions.includes(ext)) continue;

      try {
        const result = await window.electronAPI.readFile(file.path);
        if (!result.success || !result.content) continue;

        const lines = result.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineLower = line.toLowerCase();
          const matchIndex = lineLower.indexOf(queryLower);

          if (matchIndex !== -1) {
            searchResults.push({
              path: file.path,
              name: file.name,
              line: i + 1,
              content: line.trim(),
              matchStart: matchIndex,
              matchEnd: matchIndex + searchQuery.length
            });

            // Limit results per file
            if (searchResults.filter(r => r.path === file.path).length >= 5) {
              break;
            }
          }
        }

        // Limit total results
        if (searchResults.length >= 100) break;
      } catch {
        // Skip files that can't be read
      }
    }

    setResults(searchResults);
    setIsSearching(false);
  }, [decompileResult, collectFiles]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  const handleResultClick = useCallback(async (result: SearchResult) => {
    const fileResult = await window.electronAPI.readFile(result.path);
    if (fileResult.success && fileResult.content) {
      const ext = result.name.split('.').pop()?.toLowerCase();
      let language = 'plaintext';

      switch (ext) {
        case 'java':
          language = 'java';
          break;
        case 'kt':
        case 'kts':
          language = 'kotlin';
          break;
        case 'xml':
          language = 'xml';
          break;
        case 'json':
          language = 'json';
          break;
      }

      openFile({
        path: result.path,
        name: result.name,
        content: fileResult.content,
        language,
        isDirty: false
      });
    }
  }, [openFile]);

  const highlightMatch = (content: string, query: string) => {
    if (!query) return content;

    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content;

    const before = content.substring(0, index);
    const match = content.substring(index, index + query.length);
    const after = content.substring(index + query.length);

    return (
      <>
        {before}
        <span className="search-result-match">{match}</span>
        {after}
      </>
    );
  };

  return (
    <>
      <div className="panel-header">Search</div>
      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search in files..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="panel-content search-results">
        {isSearching ? (
          <div className="no-results">Searching...</div>
        ) : results.length > 0 ? (
          results.map((result, index) => (
            <div
              key={`${result.path}-${result.line}-${index}`}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
            >
              <div className="search-result-file">
                {result.name}:{result.line}
              </div>
              <div className="search-result-line">
                {highlightMatch(result.content, query)}
              </div>
            </div>
          ))
        ) : query ? (
          <div className="no-results">No results found</div>
        ) : (
          <div className="no-results">Enter a search term</div>
        )}
      </div>
    </>
  );
};

export default SearchPanel;

import React, { useState } from 'react';

/**
 * Search bar where users enter a URL to analyze.
 * Supports direct URLs or just domain names.
 */
export default function SearchBar({ onSearch, loading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !loading) {
      onSearch(trimmed);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <span className="search-prefix">🌐</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a URL or domain name..."
          disabled={loading}
          className="search-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="search-button"
        >
          {loading ? 'Analyzing...' : 'Trace Route'}
        </button>
      </div>
    </form>
  );
}

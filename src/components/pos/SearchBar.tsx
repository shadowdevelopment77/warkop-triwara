// ═══════════════════════════════════════════════
// Triwara POS — Search Bar Component
// ═══════════════════════════════════════════════

import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="search-bar-wrapper">
      <input
        type="text"
        className="search-bar-input"
        placeholder="Cari menu kopi, matcha, pastry..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="search-clear-btn" onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
};

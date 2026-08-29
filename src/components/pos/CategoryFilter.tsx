// ═══════════════════════════════════════════════
// Triwara POS — Horizontal Category Filter Pills
// ═══════════════════════════════════════════════

import React from 'react';
import type { ICategory } from '../../types';

interface CategoryFilterProps {
  categories: ICategory[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="category-filter-horizontal">
      <button
        type="button"
        className={`category-pill ${selectedCategoryId === null ? 'active' : ''}`}
        onClick={() => onSelectCategory(null)}
      >
        Semua
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`category-pill ${selectedCategoryId === cat.id ? 'active' : ''}`}
          onClick={() => onSelectCategory(cat.id!)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

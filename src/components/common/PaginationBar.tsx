// ═══════════════════════════════════════════════
// Triwara POS — Shared 10-Item Table Pagination Bar
// ═══════════════════════════════════════════════

import React from 'react';

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems === 0) return null;

  return (
    <div
      className="table-pagination-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: '#121214',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} dari {totalItems} data
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px', opacity: currentPage <= 1 ? 0.4 : 1 }}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ◀ Sebelumnya
        </button>

        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fafafa' }}>
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Berikutnya ▶
        </button>
      </div>
    </div>
  );
};

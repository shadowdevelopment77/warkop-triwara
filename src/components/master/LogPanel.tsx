// ═══════════════════════════════════════════════
// Triwara POS — Activity Logs Panel (Void & Restock Entries)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { ILog } from '../../types';
import { reportService } from '../../services/report.service';
import { formatDateIndonesian } from '../../utils/date';
import { PaginationBar } from '../common/PaginationBar';

export const LogPanel: React.FC = () => {
  const [logs, setLogs] = useState<ILog[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'void' | 'menu' | 'inventory' | 'shift' | 'system'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);

  const loadLogs = useCallback(async () => {
    try {
      setIsPageLoading(true);
      const result = await reportService.getPaginatedLogs(
        selectedCategory,
        selectedDate,
        currentPage,
        10
      );
      setLogs(result.logs);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to load paginated logs:', err);
    } finally {
      setIsPageLoading(false);
    }
  }, [selectedCategory, selectedDate, currentPage]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (newPage: number) => {
    if (isPageLoading) return; // Prevent rapid-fire multi-click jump
    setCurrentPage(newPage);
  };

  const handleCategoryChange = (cat: 'all' | 'void' | 'menu' | 'inventory' | 'shift' | 'system') => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  return (
    <div className="log-view-container">
      <div className="log-view-header">
        <div>
          <h2 className="log-view-title">Log</h2>
        </div>
      </div>

      {/* Filter Toolbar: Category Pills + Single Date Picker */}
      <div className="log-filter-toolbar">
        <div className="log-filter-pills">
          <button
            type="button"
            className={`log-filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('all')}
          >
            Semua
          </button>
          <button
            type="button"
            className={`log-filter-pill ${selectedCategory === 'void' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('void')}
          >
            Void
          </button>
          <button
            type="button"
            className={`log-filter-pill ${selectedCategory === 'menu' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('menu')}
          >
            Menu
          </button>
          <button
            type="button"
            className={`log-filter-pill ${selectedCategory === 'inventory' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('inventory')}
          >
            Inventori
          </button>
          <button
            type="button"
            className={`log-filter-pill ${selectedCategory === 'shift' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('shift')}
          >
            Buka/Tutup Toko
          </button>
          <button
            type="button"
            className={`log-filter-pill ${selectedCategory === 'system' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('system')}
          >
            Sistem
          </button>
        </div>

        <div className="log-date-filter-box">
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Tanggal:</span>
          <input
            type="date"
            className="log-date-input"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          {selectedDate && (
            <button
              type="button"
              className="log-btn-reset-date"
              onClick={() => handleDateChange('')}
              title="Reset Tanggal"
            >
              ✕ Semua Tanggal
            </button>
          )}
        </div>
      </div>

      <div className="log-list-card" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Subtle Top Progress Bar during cold fetches */}
        {isPageLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: '#3b82f6',
              zIndex: 10,
            }}
          />
        )}

        {logs.length === 0 ? (
          <p className="empty-hint-text">
            Tidak ada riwayat aktivitas sistem untuk filter yang dipilih.
          </p>
        ) : (
          <>
            <ul
              className="log-entries-list"
              style={{
                opacity: isPageLoading ? 0.4 : 1,
                transition: 'opacity 0.12s ease-in-out',
                pointerEvents: isPageLoading ? 'none' : 'auto',
              }}
            >
              {logs.map((log) => (
                <li key={log.id} className={`log-entry-item ${log.type}`}>
                  <div className="log-header-row">
                    <span className="log-type-badge">{log.type.toUpperCase()}</span>
                    <span className="log-time">{formatDateIndonesian(log.createdAt)}</span>
                  </div>
                  <p className="log-desc">{log.description}</p>
                </li>
              ))}
            </ul>

            <PaginationBar
              currentPage={currentPage}
              totalItems={totalCount}
              pageSize={10}
              disabled={isPageLoading}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

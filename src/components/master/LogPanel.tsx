// ═══════════════════════════════════════════════
// Triwara POS — Activity Logs Panel (Void & Restock Entries)
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { ILog } from '../../types';
import { reportService } from '../../services/report.service';
import { formatDateIndonesian } from '../../utils/date';
import { PaginationBar } from '../common/PaginationBar';

export const LogPanel: React.FC = () => {
  const [logs, setLogs] = useState<ILog[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'void' | 'menu' | 'inventory' | 'shift'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    reportService.getLogs(200).then(setLogs);
  }, []);

  const handleCategoryChange = (cat: 'all' | 'void' | 'menu' | 'inventory' | 'shift') => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  // Filter logs locally without expensive database queries
  const filteredLogs = logs.filter((log) => {
    if (selectedCategory !== 'all' && log.type !== selectedCategory) {
      return false;
    }
    if (selectedDate) {
      const logDate = new Date(log.createdAt).toISOString().split('T')[0];
      if (logDate !== selectedDate) {
        return false;
      }
    }
    return true;
  });

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

      <div className="log-list-card">
        {filteredLogs.length === 0 ? (
          <p className="empty-hint-text">
            Tidak ada riwayat aktivitas sistem untuk filter yang dipilih.
          </p>
        ) : (
          <>
            <ul className="log-entries-list">
              {filteredLogs
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((log) => (
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
              totalItems={filteredLogs.length}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

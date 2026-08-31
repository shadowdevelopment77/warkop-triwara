// ═══════════════════════════════════════════════
// Triwara POS — Activity Logs Panel (Structured Table View)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { ILog } from '../../types';
import { reportService } from '../../services/report.service';
import { formatDateIndonesian } from '../../utils/date';
import { PaginationBar } from '../common/PaginationBar';

type PeriodPreset = 'today' | 'month' | 'custom';
type LogCategory = 'all' | 'void' | 'restock' | 'inventory' | 'menu' | 'shift' | 'system';

const toInputDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const LogPanel: React.FC = () => {
  const [logs, setLogs] = useState<ILog[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<LogCategory>('all');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);

  // Date filters (defaults to today, matching TransactionHistoryPanel)
  const now = new Date();
  const initialStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const initialEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [startDate, setStartDate] = useState<Date>(initialStart);
  const [endDate, setEndDate] = useState<Date>(initialEnd);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('today');

  const loadLogs = useCallback(async () => {
    try {
      setIsPageLoading(true);
      const result = await reportService.getPaginatedLogs(
        selectedCategory,
        startDate,
        endDate,
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
  }, [selectedCategory, startDate, endDate, currentPage]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handlePageChange = (newPage: number) => {
    if (isPageLoading) return; // Prevent rapid-fire multi-click jump
    setCurrentPage(newPage);
  };

  const handleCategoryChange = (cat: LogCategory) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSelectPreset = (preset: 'today' | 'month') => {
    setPeriodPreset(preset);
    setCurrentPage(1);
    const cur = new Date();
    if (preset === 'today') {
      const start = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0);
      const end = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'month') {
      const start = new Date(cur.getFullYear(), cur.getMonth(), 1, 0, 0, 0);
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'void':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#ef4444', label: 'VOID' };
      case 'restock':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '#10b981', label: 'RESTOCK' };
      case 'inventory':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '#f59e0b', label: 'INVENTORI' };
      case 'menu':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '#3b82f6', label: 'MENU' };
      case 'shift':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '#a855f7', label: 'SHIFT' };
      case 'system':
        return { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '#06b6d4', label: 'SISTEM' };
      default:
        return { bg: 'rgba(161, 161, 170, 0.15)', color: '#d4d4d8', border: '#71717a', label: type.toUpperCase() };
    }
  };

  return (
    <div className="report-view-container">
      {/* Header */}
      <div className="report-view-header">
        <h2 className="report-view-title">Log Aktivitas Sistem</h2>
      </div>

      {/* Period & Category Filter Bar (Standard Triwara POS Layout) */}
      <div className="report-period-filter-bar" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="report-date-input-group">
          <label>Mulai:</label>
          <input
            type="date"
            value={toInputDateString(startDate)}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                setStartDate(new Date(y, m - 1, d, 0, 0, 0));
                setPeriodPreset('custom');
                setCurrentPage(1);
              }
            }}
          />
        </div>

        <div className="report-date-input-group">
          <label>Sampai:</label>
          <input
            type="date"
            value={toInputDateString(endDate)}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                setEndDate(new Date(y, m - 1, d, 23, 59, 59));
                setPeriodPreset('custom');
                setCurrentPage(1);
              }
            }}
          />
        </div>

        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'today' ? 'active' : ''}`}
          onClick={() => handleSelectPreset('today')}
        >
          Hari Ini
        </button>
        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'month' ? 'active' : ''}`}
          onClick={() => handleSelectPreset('month')}
        >
          Bulan Ini
        </button>
        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'custom' ? 'active' : ''}`}
          onClick={() => setPeriodPreset('custom')}
        >
          Kustom
        </button>

        {/* Category Pills inside the same unified toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'void', label: 'Void' },
              { id: 'restock', label: 'Restock' },
              { id: 'inventory', label: 'Inventori' },
              { id: 'menu', label: 'Menu' },
              { id: 'shift', label: 'Shift' },
              { id: 'system', label: 'Sistem' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`report-preset-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              style={{
                fontSize: '11px',
                padding: '6px 10px',
                borderRadius: '6px',
              }}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Structured Log Table Card */}
      <div className="report-section-card" style={{ position: 'relative', overflow: 'hidden' }}>
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

        <div className="report-table-wrapper">
          <table
            className="report-data-table"
            style={{
              opacity: isPageLoading ? 0.4 : 1,
              transition: 'opacity 0.12s ease-in-out',
              pointerEvents: isPageLoading ? 'none' : 'auto',
            }}
          >
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Waktu</th>
                <th style={{ width: '120px' }}>Kategori</th>
                <th>Deskripsi Aktivitas</th>
                <th style={{ width: '160px' }}>Referensi / ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                    {isPageLoading ? 'Memuat log aktivitas...' : 'Tidak ada catatan aktivitas sistem pada rentang waktu dan kategori yang dipilih.'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getBadgeStyle(log.type);
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {formatDateIndonesian(log.createdAt)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            display: 'inline-block',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: '#f8fafc', lineHeight: 1.5 }}>
                        {log.description}
                      </td>
                      <td style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {log.referenceId || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Unified Flush PaginationBar (Identical to TransactionHistoryPanel) */}
          <PaginationBar
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={10}
            disabled={isPageLoading}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

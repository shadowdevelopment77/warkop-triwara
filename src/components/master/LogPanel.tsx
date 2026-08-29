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

  useEffect(() => {
    reportService.getLogs().then(setLogs);
  }, []);

  return (
    <div className="master-view-container">
      <div className="master-view-header">
        <div>
          <h2 className="view-title">Log Aktivitas Sistem</h2>
          <p className="view-subtitle">Catatan pembatalan transaksi (void) dan penambahan stok (restock).</p>
        </div>
      </div>

      <div className="log-list-card">
        {logs.length === 0 ? (
          <p className="empty-hint-text">Belum ada riwayat aktivitas sistem.</p>
        ) : (
          <>
            <ul className="log-entries-list">
              {logs
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
              totalItems={logs.length}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

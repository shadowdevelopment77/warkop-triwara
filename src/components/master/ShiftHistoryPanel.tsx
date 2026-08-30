// ═══════════════════════════════════════════════
// Triwara POS — Shift Panel (Kasir & Rekap Laci Toko)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IShift, IShopConfig } from '../../types';
import { shiftService } from '../../services/shift.service';
import { configService } from '../../services/config.service';
import { formatDateIndonesian } from '../../utils/date';
import { formatRupiah } from '../../utils/currency';
import { PaginationBar } from '../common/PaginationBar';
import { ShiftReceiptModal } from './ShiftReceiptModal';

interface ShiftHistoryPanelProps {
  onOpenNewShift?: () => void;
}

export const ShiftHistoryPanel: React.FC<ShiftHistoryPanelProps> = () => {
  const [shifts, setShifts] = useState<IShift[]>([]);
  const [activeShift, setActiveShift] = useState<IShift | null>(null);
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [previewReceiptShift, setPreviewReceiptShift] = useState<IShift | null>(null);

  const loadData = useCallback(async () => {
    const list = await shiftService.getShiftHistory(100);
    const active = await shiftService.getActiveShift();
    const cfg = await configService.getConfig();
    setShifts(list);
    setActiveShift(active);
    setShopConfig(cfg);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter based on single opening date (Waktu Buka)
  const filteredShifts = shifts.filter((s) => {
    if (selectedDate) {
      const openDate = new Date(s.openedAt).toISOString().split('T')[0];
      if (openDate !== selectedDate) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="shift-view-container">
      {/* Header */}
      <div className="shift-view-header">
        <div>
          <h2 className="shift-view-title">Shift</h2>
        </div>
      </div>

      {/* Active Shift Card or Banner */}
      {activeShift ? (
        <div className="shift-pos-banner active">
          <div>
            <span>Shift Toko Berjalan: </span>
            <strong>{activeShift.cashierName}</strong>
            <span style={{ marginLeft: '12px', fontSize: '12px' }}>
              (Dibuka: {formatDateIndonesian(activeShift.openedAt)} | Kas Awal: {formatRupiah(activeShift.startingCash)})
            </span>
          </div>
          <span style={{ fontSize: '12px' }}>
            {activeShift.totalTransactions} Order | Tunai: {formatRupiah(activeShift.totalCashSales)}
          </span>
        </div>
      ) : (
        <div className="shift-pos-banner closed">
          <span>Toko Sedang Tutup. Buka toko untuk memulai shift kasir dan mencatat transaksi.</span>
        </div>
      )}

      {/* Filter Toolbar: Single Date Picker (Waktu Buka) */}
      <div className="log-filter-toolbar" style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent:'flex-end' }}>
        <div className="log-date-filter-box">
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Opening: </span>
          <input
            type="date"
            className="log-date-input"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
          />
          {selectedDate && (
            <button
              type="button"
              className="log-btn-reset-date"
              onClick={() => {
                setSelectedDate('');
                setCurrentPage(1);
              }}
              title="Reset Tanggal"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Shift Table Card */}
      <div className="shift-table-wrapper">
        <div className="shift-table-scroll">
          <table className="shift-data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Kasir</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Kas Awal</th>
                <th>Transaksi Tunai</th>
                <th>Transaksi QRIS</th>
                <th>Total Tunai</th>
                <th>Selisih</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: '#a1a1aa' }}>
                    Tidak ada data shift yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredShifts
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((shift, idx) => {
                    const diff = shift.cashDifference ?? 0;
                    const rowNumber = (currentPage - 1) * 10 + idx + 1;
                    const cashCount = shift.cashTransactions !== undefined ? shift.cashTransactions : Math.max(0, shift.totalTransactions - (shift.qrisTransactions || 0));
                    const qrisCount = shift.qrisTransactions !== undefined ? shift.qrisTransactions : (shift.totalQrisSales > 0 ? 1 : 0);

                    return (
                      <tr key={shift.id}>
                        <td>{rowNumber}</td>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{shift.cashierName}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>#{shift.shiftNumber}</div>
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {formatDateIndonesian(shift.openedAt)}
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {shift.closedAt ? formatDateIndonesian(shift.closedAt) : '— (Berjalan)'}
                        </td>
                        <td>{formatRupiah(shift.startingCash)}</td>
                        <td>{cashCount} pesanan</td>
                        <td>{qrisCount} pesanan</td>
                        <td style={{ color: '#16a34a', fontWeight: 700 }}>
                          {formatRupiah(shift.totalCashSales)}
                        </td>
                        <td>
                          {shift.status === 'closed' ? (
                            <span
                              className={`shift-diff-badge ${diff === 0 ? 'even' : diff > 0 ? 'over' : 'under'}`}
                            >
                              {diff === 0 ? 'Pas' : diff > 0 ? `+${formatRupiah(diff)}` : formatRupiah(diff)}
                            </span>
                          ) : (
                            <span style={{ color: '#a1a1aa' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: shift.status === 'open' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(113, 113, 122, 0.2)',
                              color: shift.status === 'open' ? '#4ade80' : '#a1a1aa',
                            }}
                          >
                            {shift.status === 'open' ? 'BUKA' : 'SELESAI'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="shift-btn-primary"
                            style={{ height: '30px', fontSize: '12px', padding: '0 12px' }}
                            onClick={() => setPreviewReceiptShift(shift)}
                            title="Lihat & Cetak Rekap Shift"
                          >
                            🖨️ Rekap
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredShifts.length}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Shift 58mm Thermal Receipt Preview Modal */}
      {previewReceiptShift && (
        <ShiftReceiptModal
          shift={previewReceiptShift}
          shopConfig={shopConfig}
          onClose={() => setPreviewReceiptShift(null)}
        />
      )}
    </div>
  );
};

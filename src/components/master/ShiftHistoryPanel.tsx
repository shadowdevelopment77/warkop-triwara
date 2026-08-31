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
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeShift, setActiveShift] = useState<IShift | null>(null);
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [previewReceiptShift, setPreviewReceiptShift] = useState<IShift | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsPageLoading(true);
      const result = await shiftService.getPaginatedShifts(selectedDate, currentPage, 10);
      const active = await shiftService.getActiveShift();
      const cfg = await configService.getConfig();
      setShifts(result.shifts);
      setTotalCount(result.totalCount);
      setActiveShift(active);
      setShopConfig(cfg);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setIsPageLoading(false);
    }
  }, [selectedDate, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePageChange = (newPage: number) => {
    if (isPageLoading) return; // Prevent rapid-fire multi-click jump
    setCurrentPage(newPage);
  };

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
      <div className="shift-table-wrapper" style={{ position: 'relative', overflow: 'hidden' }}>
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

        <div className="shift-table-scroll">
          <table
            className="shift-data-table"
            style={{
              opacity: isPageLoading ? 0.4 : 1,
              transition: 'opacity 0.12s ease-in-out',
              pointerEvents: isPageLoading ? 'none' : 'auto',
            }}
          >
            <thead>
              <tr>
                <th>No</th>
                <th>Kasir</th>
                <th>Opening</th>
                <th>Closing</th>
                <th>Kas Awal</th>
                <th>Penjualan Tunai</th>
                <th>Penjualan QRIS</th>
                <th>Total Omset</th>
                <th>Selisih</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: '#a1a1aa' }}>
                    {isPageLoading ? 'Memuat data shift...' : 'Tidak ada data shift yang cocok dengan filter.'}
                  </td>
                </tr>
              ) : (
                shifts.map((shift, idx) => {
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
                      <td>
                        <div style={{ color: '#16a34a', fontWeight: 600 }}>{formatRupiah(shift.totalCashSales)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{cashCount} pesanan</div>
                      </td>
                      <td>
                        <div style={{ color: '#2563eb', fontWeight: 600 }}>{formatRupiah(shift.totalQrisSales)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{qrisCount} pesanan</div>
                      </td>
                      <td style={{ color: '#0f172a', fontWeight: 700 }}>
                        {formatRupiah(shift.totalCashSales + shift.totalQrisSales)}
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
          totalItems={totalCount}
          pageSize={10}
          disabled={isPageLoading}
          onPageChange={handlePageChange}
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

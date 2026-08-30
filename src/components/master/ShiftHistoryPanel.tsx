// ═══════════════════════════════════════════════
// Triwara POS — Shift Panel (Kasir & Rekap Laci Toko)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IShift, IShopConfig } from '../../types';
import { shiftService } from '../../services/shift.service';
import { pdfService } from '../../services/pdf.service';
import { receiptService } from '../../services/receipt.service';
import { configService } from '../../services/config.service';
import { formatDateIndonesian } from '../../utils/date';
import { formatRupiah } from '../../utils/currency';
import { PaginationBar } from '../common/PaginationBar';

interface ShiftHistoryPanelProps {
  onOpenNewShift?: () => void;
}

export const ShiftHistoryPanel: React.FC<ShiftHistoryPanelProps> = ({ onOpenNewShift }) => {
  const [shifts, setShifts] = useState<IShift[]>([]);
  const [activeShift, setActiveShift] = useState<IShift | null>(null);
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>('');

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

  const handleExportPdf = async (shift: IShift) => {
    if (!shopConfig) return;
    await pdfService.exportShiftReportPdf(shift, shopConfig);
  };

  const handlePrintReceipt = (shift: IShift) => {
    if (!shopConfig) return;
    const text = receiptService.generateShiftReceiptText(shift, shopConfig);
    const printWin = window.open('', '', 'width=400,height=600');
    if (printWin) {
      printWin.document.write(
        `<pre style="font-family: monospace; font-size: 12px; padding: 10px; margin: 0;">${text}</pre>`
      );
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
    }
  };

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

        <div>
          {!activeShift && onOpenNewShift && (
            <button type="button" className="shift-btn-primary" onClick={onOpenNewShift}>
              🟢 Buka Toko
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card or Banner */}
      {activeShift ? (
        <div className="shift-pos-banner active">
          <div>
            <span>🟢 Shift Toko Berjalan: </span>
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
          <span>⚪ Toko Sedang Tutup. Buka toko untuk memulai shift kasir dan mencatat transaksi.</span>
        </div>
      )}

      {/* Filter Toolbar: Single Date Picker (Waktu Buka) */}
      <div className="log-filter-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="log-date-filter-box">
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Waktu Buka:</span>
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
              ✕ Semua Tanggal
            </button>
          )}
        </div>
      </div>

      {/* Shift Table */}
      <div className="shift-table-wrapper">
        <table className="shift-data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kasir</th>
              <th>Waktu Buka</th>
              <th>Waktu Tutup</th>
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
                        <strong style={{ color: '#fafafa' }}>{shift.cashierName}</strong>
                        <div style={{ fontSize: '11px', color: '#71717a' }}>#{shift.shiftNumber}</div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        {formatDateIndonesian(shift.openedAt)}
                      </td>
                      <td style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        {shift.closedAt ? formatDateIndonesian(shift.closedAt) : '— (Berjalan)'}
                      </td>
                      <td>{formatRupiah(shift.startingCash)}</td>
                      <td>{cashCount} pesanan</td>
                      <td>{qrisCount} pesanan</td>
                      <td style={{ color: '#4ade80', fontWeight: 700 }}>
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
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="shift-btn-action"
                            onClick={() => handleExportPdf(shift)}
                            title="Unduh PDF Rekap Shift"
                          >
                            📄 PDF
                          </button>
                          <button
                            type="button"
                            className="shift-btn-action"
                            onClick={() => handlePrintReceipt(shift)}
                            title="Cetak Ulang Struk Shift"
                          >
                            🖨️ Struk
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {filteredShifts.length > 10 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredShifts.length}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

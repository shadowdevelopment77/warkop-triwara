// ═══════════════════════════════════════════════
// Triwara POS — Shift History Panel
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
  const [selectedShiftForProducts, setSelectedShiftForProducts] = useState<IShift | null>(null);
  const [shiftProducts, setShiftProducts] = useState<{ productName: string; quantitySold: number }[]>([]);

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
    const prods = await shiftService.getShiftProductSales(shift.id!);
    await pdfService.exportShiftReportPdf(shift, prods, shopConfig);
  };

  const handlePrintReceipt = (shift: IShift) => {
    if (!shopConfig) return;
    const text = receiptService.generateShiftReceiptText(shift, shopConfig);
    const printWin = window.open('', '', 'width=400,height=600');
    if (printWin) {
      printWin.document.write(`<pre style="font-family: monospace; font-size: 12px;">${text}</pre>`);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
    }
  };

  const handleViewProducts = async (shift: IShift) => {
    const prods = await shiftService.getShiftProductSales(shift.id!);
    setSelectedShiftForProducts(shift);
    setShiftProducts(prods);
  };

  return (
    <div className="shift-view-container">
      {/* Header */}
      <div className="shift-view-header">
        <div>
          <h2 className="shift-view-title">Riwayat Shift Kasir</h2>
        </div>

        <div>
          {!activeShift && onOpenNewShift && (
            <button type="button" className="shift-btn-primary" onClick={onOpenNewShift}>
              🟢 Buka Shift Baru
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Card or Banner */}
      {activeShift ? (
        <div className="shift-pos-banner active">
          <div>
            <span>🟢 Shift Sedang Berjalan: </span>
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
          <span>⚪ Belum Ada Shift Aktif. Silakan buka shift untuk mulai bertransaksi.</span>
        </div>
      )}

      {/* Shift Table */}
      <div className="shift-table-wrapper">
        <table className="shift-data-table">
          <thead>
            <tr>
              <th>No Shift</th>
              <th>Kasir</th>
              <th>Waktu Buka</th>
              <th>Waktu Tutup</th>
              <th>Kas Awal</th>
              <th>Total Tunai</th>
              <th>Uang Fisik</th>
              <th>Selisih</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#a1a1aa' }}>
                  Belum ada riwayat shift yang tersimpan.
                </td>
              </tr>
            ) : (
              shifts
                .slice((currentPage - 1) * 10, currentPage * 10)
                .map((shift) => {
                  const diff = shift.cashDifference ?? 0;
                  return (
                    <tr key={shift.id}>
                      <td>
                        <strong>#{shift.shiftNumber}</strong>
                      </td>
                      <td>{shift.cashierName}</td>
                      <td style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        {formatDateIndonesian(shift.openedAt)}
                      </td>
                      <td style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        {shift.closedAt ? formatDateIndonesian(shift.closedAt) : '— (Berjalan)'}
                      </td>
                      <td>{formatRupiah(shift.startingCash)}</td>
                      <td style={{ color: '#4ade80' }}>+{formatRupiah(shift.totalCashSales)}</td>
                      <td>{shift.actualEndingCash !== undefined ? formatRupiah(shift.actualEndingCash) : '—'}</td>
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
                          {shift.status === 'open' ? 'AKTIF' : 'SELESAI'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="shift-btn-action"
                            onClick={() => handleViewProducts(shift)}
                            title="Lihat Menu Terjual"
                          >
                            🍔 Menu
                          </button>
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
                            🖨️ Cetak
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

      {shifts.length > 10 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={shifts.length}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modal View Products Sold during Shift */}
      {selectedShiftForProducts && (
        <div className="modal-backdrop" onClick={() => setSelectedShiftForProducts(null)}>
          <div className="inv-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3 className="inv-modal-title">
                Produk Terjual: #{selectedShiftForProducts.shiftNumber}
              </h3>
              <button
                type="button"
                className="modal-close-btn-red"
                onClick={() => setSelectedShiftForProducts(null)}
              >
                ✕
              </button>
            </div>
            <div className="inv-modal-body">
              <div className="info-summary-card">
                <div>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Kasir:</span>
                  <strong>{selectedShiftForProducts.cashierName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Total Pesanan:</span>
                  <strong>{selectedShiftForProducts.totalTransactions} Order</strong>
                </div>
              </div>

              {shiftProducts.length === 0 ? (
                <p style={{ color: '#a1a1aa', textAlign: 'center', margin: '20px 0' }}>
                  Belum ada produk terjual pada shift ini.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {shiftProducts.map((p, idx) => (
                    <div
                      key={p.productName}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#a1a1aa', fontSize: '12px' }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#fafafa' }}>{p.productName}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#60a5fa' }}>{p.quantitySold} terjual</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="inv-modal-footer">
              <button
                type="button"
                className="inv-btn-secondary"
                onClick={() => setSelectedShiftForProducts(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

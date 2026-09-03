// ═══════════════════════════════════════════════
// Triwara POS — 58mm Shift Thermal Receipt Modal
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IShift, IShopConfig } from '../../types';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';
import { pdfService } from '../../services/pdf.service';
import { printerService } from '../../services/printer.service';
import { DialogModal } from '../common/DialogModal';

interface ShiftReceiptModalProps {
  shift: IShift;
  shopConfig: IShopConfig | null;
  onClose: () => void;
}

export const ShiftReceiptModal: React.FC<ShiftReceiptModalProps> = ({
  shift,
  shopConfig,
  onClose,
}) => {
  const [isPrinted, setIsPrinted] = useState<boolean>(false);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title: string;
    message: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const config = shopConfig || {
    appName: 'Triwara POS',
    receiptHeaderLines: [],
    receiptFooterLines: [],
    pinHash: '',
  };

  const headerLines = config.receiptHeaderLines || [
    'Warkop Triwara Coffee',
    'Jl. Sunset Road No. 88, Bali',
    'Telp: 0812-3456-7890',
  ];

  const diff = shift.cashDifference ?? 0;
  const cashCount =
    shift.cashTransactions !== undefined
      ? shift.cashTransactions
      : Math.max(0, shift.totalTransactions - (shift.qrisTransactions || 0));
  const qrisCount =
    shift.qrisTransactions !== undefined
      ? shift.qrisTransactions
      : shift.totalQrisSales > 0
        ? 1
        : 0;

  const handlePrintReceipt = async () => {
    if (!config.printerMacAddress || config.printerMacAddress.trim() === '') {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Printer Belum Tersambung',
        message:
          'Printer thermal belum dihubungkan. Silakan pasangkan printer Bluetooth Anda melalui menu Pengaturan.',
      });
      return;
    }

    const result = await printerService.printShiftReceipt(shift, config);
    if (result.success) {
      setIsPrinted(true);
    } else {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Pencetakan Gagal',
        message: result.error || 'Gagal mengirim data ke printer thermal.',
        isDanger: true,
      });
    }
  };

  const [pdfProgress, setPdfProgress] = useState<{ isOpen: boolean; percent: number; message: string } | null>(null);

  const handleDownloadPdf = async () => {
    setPdfProgress({ isOpen: true, percent: 5, message: 'Memulai proses export...' });
    try {
      await pdfService.exportShiftReportPdf(shift, config, (percent, message) => {
        setPdfProgress({ isOpen: true, percent, message });
      });
      setTimeout(() => setPdfProgress(null), 800);
    } catch (err) {
      setPdfProgress(null);
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Export PDF Gagal',
        message: (err as Error).message,
        isDanger: true,
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '440px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="inv-modal-header" style={{ flexShrink: 0 }}>
          <div>
            <h3 className="inv-modal-title">Struk Rekap Shift</h3>
            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
              Shift #{shift.shiftNumber} ({shift.cashierName})
            </span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="inv-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Pratinjau struk thermal 58mm untuk rekap shift kasir:
          </p>

          {/* Realistic 58mm Thermal Receipt Paper Preview */}
          <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px' }}>
            <div className="thermal-receipt-paper-preview">
              {/* Header / Store Branding */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                {config.receiptLogoBase64 && (
                  <div style={{ marginBottom: '6px' }}>
                    <img
                      src={config.receiptLogoBase64}
                      alt="Logo Struk"
                      style={{
                        maxHeight: '48px',
                        maxWidth: '160px',
                        objectFit: 'contain',
                        filter: 'grayscale(100%) contrast(150%)',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase' }}>
                  {config.appName || 'Warkop Triwara'}
                </div>
                {headerLines.map((h, i) => (
                  <div key={i} style={{ fontSize: '9px', color: '#333333' }}>
                    {h}
                  </div>
                ))}
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '11px',
                    marginTop: '6px',
                    padding: '2px 0',
                    borderTop: '1px solid #000',
                    borderBottom: '1px solid #000',
                  }}
                >
                  REKAP SHIFT KASIR
                </div>
              </div>

              {/* Shift Metadata */}
              <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>No. Shift:</span>
                  <strong>#{shift.shiftNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kasir:</span>
                  <strong>{shift.cashierName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Waktu Buka:</span>
                  <span>{formatDateIndonesian(shift.openedAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Waktu Tutup:</span>
                  <span>{shift.closedAt ? formatDateIndonesian(shift.closedAt) : '— (Masih Buka)'}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />

              {/* Financial Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Modal Kas Awal:</span>
                  <strong>{formatRupiah(shift.startingCash)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaksi Tunai ({cashCount}):</span>
                  <span>+{formatRupiah(shift.totalCashSales)}</span>
                </div>
                {shift.totalExpenses && shift.totalExpenses > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                      <span>Total Pengeluaran Kasir:</span>
                      <strong>-{formatRupiah(shift.totalExpenses)}</strong>
                    </div>
                    {shift.borrowedFromSales && shift.borrowedFromSales > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontStyle: 'italic', color: '#b45309' }}>
                        <span>*(Pinjam Uang Sales):</span>
                        <span>{formatRupiah(shift.borrowedFromSales)}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaksi QRIS ({qrisCount}):</span>
                  <span>{formatRupiah(shift.totalQrisSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Total Pesanan Dibatalkan:</span>
                  <span>{shift.totalVoided} void</span>
                </div>
              </div>

              {/* Detailed Expense List in Receipt Preview */}
              {shift.expenses && shift.expenses.length > 0 && (
                <>
                  <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />
                  <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 700 }}>Rincian Belanja Kasir:</span>
                    {shift.expenses.map((e, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                        <span>{idx + 1}. {e.description}</span>
                        <span>{formatRupiah(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />

              {/* Reconciliation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ekspektasi Uang Kas:</span>
                  <span>{formatRupiah(shift.expectedEndingCash ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Kas Fisik Dihitung:</span>
                  <span>{formatRupiah(shift.actualEndingCash ?? shift.expectedEndingCash ?? 0)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '11px',
                    color: diff === 0 ? '#15803d' : diff > 0 ? '#b45309' : '#b91c1c',
                  }}
                >
                  <span>Selisih Kas:</span>
                  <span>
                    {diff === 0
                      ? 'PAS (Rp 0)'
                      : diff > 0
                        ? `LEBIH (+${formatRupiah(diff)})`
                        : `KURANG (${formatRupiah(diff)})`}
                  </span>
                </div>
                {shift.notes && (
                  <div style={{ fontSize: '9px', color: '#555', fontStyle: 'italic', marginTop: '2px' }}>
                    Catatan: {shift.notes}
                  </div>
                )}
              </div>

              <div style={{ borderBottom: '1px dashed #000000', margin: '8px 0' }} />

              {/* Signature Area */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  fontSize: '9px',
                  marginTop: '12px',
                  padding: '0 10px',
                }}
              >
                <div>
                  <div>Kasir</div>
                  <div style={{ height: '30px' }} />
                  <div>( {shift.cashierName} )</div>
                </div>
                <div>
                  <div>Supervisor / Owner</div>
                  <div style={{ height: '30px' }} />
                  <div>( .................... )</div>
                </div>
              </div>

              {/* Zigzag Paper Tear Cut */}
              <div className="thermal-receipt-tear-cut" />
            </div>
          </div>

          {/* Action Buttons Below Preview */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexShrink: 0 }}>
            <button
              type="button"
              className="shift-btn-primary"
              style={{ flex: 1, height: '40px', justifyContent: 'center' }}
              onClick={handlePrintReceipt}
            >
              🖨️ Cetak Struk Rekap
            </button>
            <button
              type="button"
              className="shift-btn-action"
              style={{ flex: 1, height: '40px', justifyContent: 'center' }}
              onClick={handleDownloadPdf}
              disabled={!!pdfProgress?.isOpen}
            >
              {pdfProgress?.isOpen ? '⏳ Memproses...' : '📄 Unduh PDF'}
            </button>
          </div>

          {isPrinted && (
            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '12px', marginTop: '4px', fontWeight: 600, flexShrink: 0 }}>
              ✓ Struk rekap shift berhasil dikirim ke printer thermal.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="inv-modal-footer" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="shift-btn-primary"
            style={{ width: '100%', height: '40px', justifyContent: 'center' }}
            onClick={onClose}
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>

      {/* PDF Export Progress Modal */}
      {pdfProgress && pdfProgress.isOpen && (
        <div className="modal-backdrop" style={{ zIndex: 9999 }}>
          <div
            className="settings-modal-card"
            style={{
              maxWidth: '380px',
              width: '90%',
              textAlign: 'center',
              padding: '24px',
              backgroundColor: '#18181b',
              border: '1px solid #3b82f6',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#f4f4f5' }}>
              📄 Mengekspor Laporan PDF
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#93c5fd' }}>
              {pdfProgress.message}
            </p>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#27272a',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pdfProgress.percent}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginTop: '8px' }}>
              {pdfProgress.percent}%
            </span>
          </div>
        </div>
      )}

      <DialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type || 'alert'}
        title={dialogConfig.title}
        message={dialogConfig.message}
        isDanger={dialogConfig.isDanger}
        onConfirm={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

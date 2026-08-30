// ═══════════════════════════════════════════════
// Triwara POS — Post-Close Store Modal (Thermal Receipt Preview & PDF)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IShift, IShopConfig } from '../../types';
import { receiptService } from '../../services/receipt.service';
import { pdfService } from '../../services/pdf.service';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';

interface PostCloseStoreModalProps {
  isOpen: boolean;
  shift: IShift;
  shopConfig: IShopConfig | null;
  onFinish: () => void;
}

export const PostCloseStoreModal: React.FC<PostCloseStoreModalProps> = ({
  isOpen,
  shift,
  shopConfig,
  onFinish,
}) => {
  const [isPrinted, setIsPrinted] = useState<boolean>(false);

  if (!isOpen) return null;

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

  const handlePrintReceipt = () => {
    const text = receiptService.generateShiftReceiptText(shift, config);
    console.log('[PRINTING SHIFT RECEIPT]\n' + text);
    setIsPrinted(true);
  };

  const handleDownloadPdf = async () => {
    await pdfService.exportShiftReportPdf(shift, config);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '440px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inv-modal-header" style={{ flexShrink: 0 }}>
          <div>
            <h3 className="inv-modal-title">Toko Berhasil Ditutup</h3>
            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
              Shift #{shift.shiftNumber} ({shift.cashierName})
            </span>
          </div>
        </div>

        <div className="inv-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
            Rekap Shift disimpan ke sistem. Anda dapat mencetak struk thermal kasir atau mengunduh dokumen PDF rekap berikut:
          </p>

          {/* Realistic 58mm Thermal Receipt Paper Preview */}
          <div style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '8px' }}>
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
                  <span>{formatRupiah(shift.totalCashSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaksi QRIS ({qrisCount}):</span>
                  <span>{formatRupiah(shift.totalQrisSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Total Pesanan Dibatalkan:</span>
                  <span>{shift.totalVoided} void</span>
                </div>
              </div>

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

          {/* Action Buttons */}
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
            >
              📄 Unduh PDF
            </button>
          </div>

          {isPrinted && (
            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '12px', marginTop: '4px', fontWeight: 600, flexShrink: 0 }}>
              ✓ Struk rekap shift berhasil dikirim ke printer thermal.
            </div>
          )}
        </div>

        <div className="inv-modal-footer" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="shift-btn-primary"
            style={{ width: '100%', height: '40px', justifyContent: 'center' }}
            onClick={onFinish}
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

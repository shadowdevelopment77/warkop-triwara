// ═══════════════════════════════════════════════
// Triwara POS — 58mm Shift Thermal Receipt Modal
// ═══════════════════════════════════════════════

import React from 'react';
import type { IShift, IShopConfig } from '../../types';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';
import { receiptService } from '../../services/receipt.service';

interface ShiftReceiptModalProps {
  shift: IShift;
  shopConfig: IShopConfig | null;
  onClose: () => void;
  onPrintSuccess?: () => void;
}

export const ShiftReceiptModal: React.FC<ShiftReceiptModalProps> = ({
  shift,
  shopConfig,
  onClose,
  onPrintSuccess,
}) => {
  const headerLines = shopConfig?.receiptHeaderLines || [
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

  const handlePrint = () => {
    const text = receiptService.generateShiftReceiptText(
      shift,
      shopConfig || {
        appName: 'Triwara POS',
        receiptHeaderLines: [],
        receiptFooterLines: [],
        pinHash: '',
      }
    );
    console.log('[PRINTING SHIFT RECEIPT]\n' + text);

    if (onPrintSuccess) {
      onPrintSuccess();
    } else {
      alert(`Struk Shift #${shift.shiftNumber} berhasil dikirim ke printer thermal.`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="pos-modal-card print-select-card"
        style={{ maxWidth: '420px', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="pos-modal-header">
          <div>
            <h3 className="pos-modal-title">Struk Rekap Shift</h3>
            <span className="pos-print-order-sub">Shift #{shift.shiftNumber} ({shift.cashierName})</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        {/* Action Button Bar */}
        <div className="receipt-print-actions-bar" style={{ padding: '10px 14px' }}>
          <button
            type="button"
            className="btn-print-choice"
            style={{ width: '100%', justifyContent: 'center', backgroundColor: '#fafafa', color: '#09090b', fontWeight: 800 }}
            onClick={handlePrint}
            title="Kirim ke Printer Thermal"
          >
            <span>🖨️ Cetak Struk Rekap</span>
          </button>
        </div>

        {/* Realistic 58mm Thermal Receipt Paper Preview */}
        <div className="modal-body" style={{ padding: '16px', backgroundColor: '#18181b', overflowY: 'auto', flex: 1 }}>
          <div className="thermal-receipt-paper-preview">
            {/* Header / Store Branding */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              {shopConfig?.receiptLogoBase64 && (
                <div style={{ marginBottom: '6px' }}>
                  <img
                    src={shopConfig.receiptLogoBase64}
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
                {shopConfig?.appName || 'Warkop Triwara'}
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
      </div>
    </div>
  );
};

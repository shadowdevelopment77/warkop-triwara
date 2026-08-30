// ═══════════════════════════════════════════════
// Triwara POS — Post-Close Store Modal (Thermal Receipt Preview & PDF)
// ═══════════════════════════════════════════════

import React from 'react';
import type { IShift, IShopConfig } from '../../types';
import { receiptService } from '../../services/receipt.service';
import { pdfService } from '../../services/pdf.service';

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
  if (!isOpen) return null;

  const config = shopConfig || {
    appName: 'Triwara POS',
    receiptHeaderLines: [],
    receiptFooterLines: [],
    pinHash: '',
  };

  const receiptText = receiptService.generateShiftReceiptText(shift, config);

  const handlePrintReceipt = () => {
    console.log('[PRINTING SHIFT RECEIPT]\n' + receiptText);
    const printWin = window.open('', '', 'width=400,height=600');
    if (printWin) {
      printWin.document.write(
        `<pre style="font-family: monospace; font-size: 12px; padding: 10px; margin: 0;">${receiptText}</pre>`
      );
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
    }
  };

  const handleDownloadPdf = async () => {
    await pdfService.exportShiftReportPdf(shift, config);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '440px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inv-modal-header">
          <div>
            <h3 className="inv-modal-title">🏪 Toko Berhasil Ditutup</h3>
            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
              Shift #{shift.shiftNumber} ({shift.cashierName})
            </span>
          </div>
        </div>

        <div className="inv-modal-body">
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 10px 0' }}>
            Rekap laci kas telah disimpan ke sistem. Anda dapat mencetak struk thermal kasir atau mengunduh dokumen PDF rekap berikut:
          </p>

          {/* Thermal Receipt Preview */}
          <div
            style={{
              backgroundColor: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '14px',
              maxHeight: '260px',
              overflowY: 'auto',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            <pre
              style={{
                fontFamily: 'Courier, monospace',
                fontSize: '11px',
                color: '#fafafa',
                margin: 0,
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {receiptText}
            </pre>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
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
        </div>

        <div className="inv-modal-footer">
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

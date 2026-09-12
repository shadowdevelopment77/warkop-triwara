// ═══════════════════════════════════════════════
// Triwara POS — Transaction Void Modal Dialog
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IOrder } from '../../types';
import { formatRupiah } from '../../utils/currency';

interface VoidModalProps {
  order: IOrder;
  onClose: () => void;
  onConfirmVoid: (reason: string) => Promise<void> | void;
}

export const VoidModal: React.FC<VoidModalProps> = ({ order, onClose, onConfirmVoid }) => {
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!reason.trim()) {
      setErrorMsg('Harap masukkan alasan pembatalan transaksi');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmVoid(reason.trim());
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !isSubmitting && onClose()} style={{ zIndex: 9999 }}>
      <div
        className="report-void-card"
        style={{ maxWidth: '440px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-void-header">
          <h3 className="report-void-title">
            🚫 Batalkan Transaksi #{order.orderNumber}
          </h3>
          <button
            type="button"
            className="modal-close-btn-red"
            onClick={onClose}
            disabled={isSubmitting}
            title="Tutup"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="report-void-body" style={{ padding: '20px', overflowY: 'auto' }}>
            {errorMsg && <div className="form-error-alert" style={{ marginBottom: '12px' }}>{errorMsg}</div>}

            <div
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Pelanggan:</span>
                <strong style={{ color: '#0f172a' }}>{order.customerName || 'Umum'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Total Belanja:</span>
                <strong style={{ color: '#ef4444' }}>{formatRupiah(order.total)}</strong>
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>
                ⚠️ Seluruh stok bahan baku &amp; kemasan dari transaksi ini akan dikembalikan ke gudang.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alasan Pembatalan / Void</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: Salah input menu, pelanggan cancel..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="report-void-footer">
            <button
              type="button"
              className="report-void-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="report-void-btn-danger"
              disabled={isSubmitting}
              style={{
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Memproses Void...' : 'Konfirmasi Void Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

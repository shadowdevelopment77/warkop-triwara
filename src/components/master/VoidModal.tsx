// ═══════════════════════════════════════════════
// Triwara POS — Transaction Void Modal Dialog
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IOrder } from '../../types';
import { formatRupiah } from '../../utils/currency';

interface VoidModalProps {
  order: IOrder;
  onClose: () => void;
  onConfirmVoid: (reason: string) => void;
}

export const VoidModal: React.FC<VoidModalProps> = ({ order, onClose, onConfirmVoid }) => {
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Harap masukkan alasan pembatalan transaksi');
      return;
    }
    onConfirmVoid(reason.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="master-modal-card"
        style={{ maxWidth: '440px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <div>
            <h3 className="master-modal-title" style={{ color: '#f87171' }}>
              🚫 Batalkan Transaksi (Void)
            </h3>
            <span className="master-modal-subtitle">Transaksi #{order.orderNumber}</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="master-modal-body" style={{ padding: '20px' }}>
          {errorMsg && <div className="form-error-alert" style={{ marginBottom: '12px' }}>{errorMsg}</div>}

          <div
            style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#a1a1aa' }}>Pelanggan:</span>
              <strong style={{ color: '#fafafa' }}>{order.customerName || 'Umum'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#a1a1aa' }}>Total Belanja:</span>
              <strong style={{ color: '#f87171' }}>{formatRupiah(order.total)}</strong>
            </div>
            <div style={{ color: '#a1a1aa', fontSize: '11px', marginTop: '6px' }}>
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
              autoFocus
              required
            />
          </div>

          <div className="master-modal-footer" style={{ margin: '20px -20px -20px -20px' }}>
            <button type="button" className="master-btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="master-btn-danger">
              Konfirmasi Void Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

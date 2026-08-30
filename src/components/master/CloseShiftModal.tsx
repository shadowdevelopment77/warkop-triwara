// ═══════════════════════════════════════════════
// Triwara POS — Close Shift Modal (Cash Reconciliation & Z-Report)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IShift } from '../../types';
import { shiftService } from '../../services/shift.service';
import { formatRupiah } from '../../utils/currency';

interface CloseShiftModalProps {
  isOpen: boolean;
  shift: IShift;
  onClose: () => void;
  onClosed: (closedShift: IShift) => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  shift,
  onClose,
  onClosed,
}) => {
  const expectedCash = shift.startingCash + shift.totalCashSales;
  const [actualCash, setActualCash] = useState<number>(expectedCash);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const diff = actualCash - expectedCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (actualCash < 0) {
      setErrorMsg('Uang fisik di laci tidak boleh bernilai negatif');
      return;
    }

    try {
      setIsSubmitting(true);
      const closed = await shiftService.closeShift(shift.id!, actualCash, notes.trim());
      onClosed(closed);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inv-modal-header">
          <h3 className="inv-modal-title">Tutup Toko</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="inv-modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

          {/* Shift Info */}
          <div className="info-summary-card">
            <div>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Nomor Shift:</span>
              <strong style={{ display: 'block', color: '#fafafa' }}>#{shift.shiftNumber}</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Kasir:</span>
              <strong style={{ display: 'block', color: '#60a5fa' }}>{shift.cashierName}</strong>
            </div>
          </div>

          {/* Cash Summary */}
          <div
            style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a1a1aa' }}>Kas Awal (Modal Kembalian):</span>
              <strong style={{ color: '#fafafa' }}>{formatRupiah(shift.startingCash)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a1a1aa' }}>+ Penjualan Tunai Shift Ini:</span>
              <strong style={{ color: '#4ade80' }}>+{formatRupiah(shift.totalCashSales)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #3f3f46',
                paddingTop: '6px',
              }}
            >
              <span style={{ color: '#fafafa', fontWeight: 600 }}>Total Uang Laci (Seharusnya):</span>
              <strong style={{ color: '#fafafa', fontSize: '15px' }}>{formatRupiah(expectedCash)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '12px' }}>
              <span>Penjualan QRIS (Non-Tunai):</span>
              <span>{formatRupiah(shift.totalQrisSales)}</span>
            </div>
          </div>

          {/* Input Actual Physical Cash */}
          <div className="inv-form-group">
            <label className="inv-form-label">Uang Tunai Fisik di Laci Kasir (Rp)</label>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '18px', fontWeight: 700, height: '46px' }}
              value={actualCash || ''}
              onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
              required
              min="0"
            />

          </div>

          {/* Live Difference Badge */}
          <div
            className={`shift-diff-badge ${diff === 0 ? 'even' : diff > 0 ? 'over' : 'under'}`}
            style={{ padding: '10px 14px', borderRadius: '6px', textAlign: 'center', fontSize: '14px' }}
          >
            {diff === 0 && `Selisih Kas: Rp 0 (PAS / Sesuai Sistem)`}
            {diff > 0 && ` Selisih Kas: +${formatRupiah(diff)} (Uang Fisik Lebih)`}
            {diff < 0 && ` Selisih Kas: -${formatRupiah(Math.abs(diff))} (Uang Fisik Kurang)`}
          </div>

          {/* Notes */}
          <div className="inv-form-group">
            <label className="inv-form-label">Catatan Tutup Toko (Opsional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Ada uang kembalian rusak / pecahan tip..."
            />
          </div>

          <div className="inv-modal-footer" style={{ margin: '12px -20px -20px -20px' }}>
            <button type="button" className="inv-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className="shift-btn-danger" disabled={isSubmitting}>
              {isSubmitting ? 'Menutup Toko...' : 'Selesaikan Tutup Toko'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

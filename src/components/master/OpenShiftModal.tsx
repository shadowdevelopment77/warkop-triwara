// ═══════════════════════════════════════════════
// Triwara POS — Open Shift Modal Dialog
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IStaff, IShift } from '../../types';
import { shiftService } from '../../services/shift.service';
import { formatRupiah } from '../../utils/currency';

interface OpenShiftModalProps {
  isOpen: boolean;
  staff: IStaff;
  onClose: () => void;
  onOpened: (shift: IShift) => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  staff,
  onClose,
  onOpened,
}) => {
  const [startingCash, setStartingCash] = useState<number>(100000);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (startingCash < 0) {
      setErrorMsg('Modal awal kas tidak boleh negatif');
      return;
    }

    try {
      setIsSubmitting(true);
      const shift = await shiftService.openShift(staff, startingCash, notes.trim());
      onOpened(shift);
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
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inv-modal-header">
          <h3 className="inv-modal-title">Buka Toko</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="inv-modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

          <div className="info-summary-card">
            <div>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Petugas Kasir:</span>
              <h4 style={{ margin: 0, color: '#fafafa', fontSize: '16px' }}>{staff.name}</h4>
            </div>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: staff.role === 'owner' ? '#3b82f6' : '#27272a',
                color: '#fafafa',
                padding: '3px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              {staff.role}
            </span>
          </div>

          <div className="inv-form-group">
            <label className="inv-form-label">Uang Kas Awal / Modal Kembalian Toko (Rp)</label>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '18px', fontWeight: 700, height: '46px' }}
              value={startingCash || ''}
              onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)}
              required
              min="0"
              placeholder="100000"
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {[50000, 100000, 200000, 300000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() => setStartingCash(nominal)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '11px',
                    borderRadius: '4px',
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#fafafa',
                    cursor: 'pointer',
                  }}
                >
                  {formatRupiah(nominal)}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
              Uang tunai fisik yang diletakkan di laci kasir saat buka toko untuk uang kembalian.
            </span>
          </div>

          <div className="inv-form-group">
            <label className="inv-form-label">Catatan Buka Toko (Opsional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Kas awal pecahan 5rb & 10rb..."
            />
          </div>

          <div className="inv-modal-footer" style={{ margin: '12px -20px -20px -20px' }}>
            <button type="button" className="inv-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className="inv-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Membuka Toko...' : 'Buka Toko Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

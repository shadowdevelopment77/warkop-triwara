// ═══════════════════════════════════════════════
// Triwara POS — Close Shift Modal (Cash Reconciliation & Z-Report)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IShift, IShiftExpense } from '../../types';
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
  const [expenses, setExpenses] = useState<IShiftExpense[]>([]);
  const [descInput, setDescInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<number | ''>('');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const borrowedFromSales = Math.max(0, totalExpenses - shift.startingCash);
  const expectedCash = shift.startingCash + shift.totalCashSales - totalExpenses;

  const [actualCash, setActualCash] = useState<number>(expectedCash);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync actualCash when expected changes if user hasn't edited
  const [hasManuallyEditedActual, setHasManuallyEditedActual] = useState(false);
  React.useEffect(() => {
    if (!hasManuallyEditedActual) {
      setActualCash(expectedCash);
    }
  }, [expectedCash, hasManuallyEditedActual]);

  if (!isOpen) return null;

  const diff = actualCash - expectedCash;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descInput.trim() || !amountInput || Number(amountInput) <= 0) return;

    setExpenses([
      ...expenses,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: descInput.trim(),
        amount: Number(amountInput),
      },
    ]);
    setDescInput('');
    setAmountInput('');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (actualCash < 0) {
      setErrorMsg('Uang fisik di laci tidak boleh bernilai negatif');
      return;
    }

    try {
      setIsSubmitting(true);
      const closed = await shiftService.closeShift(
        shift.id!,
        actualCash,
        notes.trim(),
        expenses
      );
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
        style={{ maxWidth: '520px' }}
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
              <span style={{ fontSize: '12px', color: '#64748b' }}>Nomor Shift:</span>
              <strong style={{ display: 'block', color: '#0f172a' }}>#{shift.shiftNumber}</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Kasir:</span>
              <strong style={{ display: 'block', color: '#2563eb' }}>{shift.cashierName}</strong>
            </div>
          </div>

          {/* Cash Summary Card */}
          <div
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Kas Awal (Modal Kembalian):</span>
              <strong style={{ color: '#0f172a' }}>{formatRupiah(shift.startingCash)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>+ Penjualan Tunai Shift Ini:</span>
              <strong style={{ color: '#16a34a' }}>+{formatRupiah(shift.totalCashSales)}</strong>
            </div>

            {totalExpenses > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>- Total Pembelian / Pengeluaran:</span>
                <strong>-{formatRupiah(totalExpenses)}</strong>
              </div>
            )}

            {borrowedFromSales > 0 && (
              <div
                style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: '#b45309',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚠️</span>
                <span>
                  Pembelian melebihi kas awal: <strong>Pinjam Uang Sales {formatRupiah(borrowedFromSales)}</strong>
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #cbd5e1',
                paddingTop: '8px',
                marginTop: '4px',
              }}
            >
              <span style={{ color: '#0f172a', fontWeight: 700 }}>Total Uang Laci (Seharusnya):</span>
              <strong style={{ color: '#0f172a', fontSize: '16px' }}>{formatRupiah(expectedCash)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
              <span>Penjualan QRIS (Non-Tunai):</span>
              <span>{formatRupiah(shift.totalQrisSales)}</span>
            </div>
          </div>

          {/* Operational Expenses Section (Pembelian / Petty Cash) */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                🛒 Pembelian / Pengeluaran Operasional (Opsional)
              </span>
              {totalExpenses > 0 && (
                <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>
                  Total: -{formatRupiah(totalExpenses)}
                </span>
              )}
            </div>

            {/* Input Row for New Expense */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Beli apa? cth: Es Batu 1 Bal"
                className="form-input"
                style={{ flex: 2, height: '36px', fontSize: '13px' }}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="Rp..."
                className="form-input"
                style={{ flex: 1, height: '36px', fontSize: '13px' }}
                value={amountInput || ''}
                onChange={(e) => setAmountInput(parseFloat(e.target.value) || '')}
              />
              <button
                type="button"
                onClick={handleAddExpense}
                disabled={!descInput.trim() || !amountInput}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: !descInput.trim() || !amountInput ? 'not-allowed' : 'pointer',
                  opacity: !descInput.trim() || !amountInput ? 0.5 : 1,
                }}
              >
                + Tambah
              </button>
            </div>

            {/* Expense Items List */}
            {expenses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {expenses.map((exp, idx) => (
                  <div
                    key={exp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>#{idx + 1}</span>
                      <strong style={{ color: '#0f172a' }}>{exp.description}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                        -{formatRupiah(exp.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(exp.id)}
                        style={{ color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                        title="Hapus Pengeluaran"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Actual Physical Cash */}
          <div className="inv-form-group">
            <label className="inv-form-label">Uang Tunai Fisik di Laci Kasir (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              className="form-input"
              style={{ fontSize: '18px', fontWeight: 700, height: '46px' }}
              value={actualCash || ''}
              onChange={(e) => {
                setHasManuallyEditedActual(true);
                setActualCash(parseFloat(e.target.value) || 0);
              }}
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
            {diff > 0 && `Selisih Kas: +${formatRupiah(diff)} (Uang Fisik Lebih)`}
            {diff < 0 && `Selisih Kas: -${formatRupiah(Math.abs(diff))} (Uang Fisik Kurang)`}
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

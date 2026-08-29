// ═══════════════════════════════════════════════
// Triwara POS — Payment Checkout Modal (Cash / QRIS)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { PaymentMethod } from '../../types';
import { formatRupiah } from '../../utils/currency';

interface PaymentModalProps {
  totalAmount: number;
  onClose: () => void;
  onConfirmPayment: (
    customerName: string,
    paymentMethod: PaymentMethod,
    paymentAmount: number
  ) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  totalAmount,
  onClose,
  onConfirmPayment,
}) => {
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashInput, setCashInput] = useState<number>(totalAmount);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const quickDenominations = [
    { label: '20.000', value: 20000 },
    { label: '50.000', value: 50000 },
    { label: '100.000', value: 100000 },
    { label: 'Uang Pas', value: totalAmount },
  ];

  const changeAmount = Math.max(0, cashInput - totalAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (paymentMethod === 'cash' && cashInput < totalAmount) {
      setErrorMsg('Uang pembayaran kurang dari total belanja.');
      return;
    }
    onConfirmPayment(
      customerName.trim() || 'Umum',
      paymentMethod,
      paymentMethod === 'cash' ? cashInput : totalAmount
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pos-modal-card payment-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-header">
          <div>
            <h3 className="pos-modal-title">Pembayaran</h3>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pos-modal-body">
          {errorMsg && <div className="form-error-alert" style={{ marginBottom: '12px' }}>{errorMsg}</div>}

          {/* Customer Name */}
          <div className="form-group">
            <label className="form-label">Nama Pelanggan (Opsional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cth: Budi, Ani, Mas Bro..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Payment Method Selector */}
          <div className="form-group">
            <label className="form-label">Metode Pembayaran</label>
            <div className="btn-toggle-group">
              <button
                type="button"
                className={`toggle-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('cash');
                  setCashInput(totalAmount);
                }}
              >
                Tunai
              </button>
              <button
                type="button"
                className={`toggle-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('qris');
                  setCashInput(totalAmount);
                }}
              >
                QRIS
              </button>
            </div>
          </div>

          {/* Cash Input Options */}
          {paymentMethod === 'cash' && (
            <div className="cash-payment-section">
              <label className="form-label">Total Tagihan: {formatRupiah(totalAmount)}</label>

              <div className="quick-denominations-row">
                {quickDenominations.map((helper) => (
                  <button
                    key={helper.label}
                    type="button"
                    className={`denom-btn ${cashInput === helper.value ? 'active' : ''}`}
                    onClick={() => setCashInput(helper.value)}
                  >
                    {helper.label}
                  </button>
                ))}
              </div>

              <input
                type="number"
                className="form-input price-input-lg"
                value={cashInput || ''}
                onChange={(e) => setCashInput(parseFloat(e.target.value) || 0)}
                required
              />

              <div className="change-display-card">
                <span>Kembalian: </span>
                <strong className="change-val">{formatRupiah(changeAmount)}</strong>
              </div>
            </div>
          )}

          {paymentMethod === 'qris' && (
            <div className="qris-notice-box">
              <p>Total Tagihan: {formatRupiah(totalAmount)}</p>
              <small>Pastikan pembayaran sudah diterima.</small>
            </div>
          )}

          <div className="pos-modal-footer">
            <button type="button" className="pos-btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="pos-btn-primary">
              Bayar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

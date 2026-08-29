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

  const cashHelpers = [
    { label: '20.000', value: 20000 },
    { label: '50.000', value: 50000 },
    { label: '100.000', value: 100000 },
    { label: 'Uang Pas', value: totalAmount },
  ];

  const changeAmount = Math.max(0, cashInput - totalAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'cash' && cashInput < totalAmount) {
      alert('Uang pembayaran kurang dari total belanja');
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
      <div className="modal-card payment-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Pembayaran Transaksi</h3>
            <span className="modal-subtitle">Total Tagihan: {formatRupiah(totalAmount)}</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
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
                Tunai (Cash)
              </button>
              <button
                type="button"
                className={`toggle-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('qris');
                  setCashInput(totalAmount);
                }}
              >
                QRIS / E-Wallet
              </button>
            </div>
          </div>

          {/* Cash Input Options */}
          {paymentMethod === 'cash' && (
            <div className="cash-payment-section">
              <label className="form-label">Nominal Uang Diterima (Rp)</label>

              <div className="quick-denominations-row">
                {cashHelpers.map((helper) => (
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
                <span>Kembalian:</span>
                <strong className="change-val">{formatRupiah(changeAmount)}</strong>
              </div>
            </div>
          )}

          {paymentMethod === 'qris' && (
            <div className="qris-notice-box">
              <p>Tunjukkan QRIS toko ke pelanggan untuk di-scan.</p>
              <small>Tandai pembayaran selesai setelah dana masuk ke e-wallet/bank toko.</small>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Proses &amp; Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

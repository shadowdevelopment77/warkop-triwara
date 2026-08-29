// ═══════════════════════════════════════════════
// Triwara POS — Manual Print Selection Modal
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { ReceiptType } from '../../services/receipt.service';

interface PrintSelectModalProps {
  orderNumber: string;
  onClose: () => void;
  onConfirmPrint: (selectedTypes: ReceiptType[]) => void;
}

export const PrintSelectModal: React.FC<PrintSelectModalProps> = ({
  orderNumber,
  onClose,
  onConfirmPrint,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<ReceiptType[]>(['customer']);

  const handleToggle = (type: ReceiptType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handlePrint = () => {
    if (selectedTypes.length === 0) {
      alert('Pilih minimal 1 jenis struk untuk dicetak');
      return;
    }
    onConfirmPrint(selectedTypes);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card print-select-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Cetak Struk Transaksi</h3>
            <span className="modal-subtitle">Order #{orderNumber}</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [✕]
          </button>
        </div>

        <div className="modal-body">
          <p className="print-instruction">Pilih jenis struk yang ingin dicetak ke printer thermal:</p>

          <div className="print-options-list">
            <label
              className={`print-option-row ${selectedTypes.includes('customer') ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes('customer')}
                onChange={() => handleToggle('customer')}
              />
              <div className="option-label-group">
                <strong>Struk Pelanggan (Customer)</strong>
                <small>Lengkap dengan logo, header toko, harga, dan 4 baris footer (WiFi/Pass)</small>
              </div>
            </label>

            <label className={`print-option-row ${selectedTypes.includes('bar') ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={selectedTypes.includes('bar')}
                onChange={() => handleToggle('bar')}
              />
              <div className="option-label-group">
                <strong>Struk Bar (Minuman)</strong>
                <small>Khusus pembuatan minuman di bar, dengan harga total</small>
              </div>
            </label>

            <label
              className={`print-option-row ${selectedTypes.includes('kitchen') ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes('kitchen')}
                onChange={() => handleToggle('kitchen')}
              />
              <div className="option-label-group">
                <strong>Struk Dapur (Kitchen)</strong>
                <small>Khusus pembuatan makanan, TANPA harga</small>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Selesai / Tanpa Cetak
          </button>
          <button type="button" className="btn-primary" onClick={handlePrint}>
            Cetak Struk Terpilih ({selectedTypes.length})
          </button>
        </div>
      </div>
    </div>
  );
};

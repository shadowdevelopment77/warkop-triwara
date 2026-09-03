import React, { useState } from 'react';

interface SaveHeldOrderModalProps {
  onClose: () => void;
  onSave: (customerName: string) => Promise<void>;
}

export const SaveHeldOrderModal: React.FC<SaveHeldOrderModalProps> = ({ onClose, onSave }) => {
  const [customerName, setCustomerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await onSave(customerName);
    } catch (err) {
      setError((err as Error).message);
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pos-modal-card payment-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="pos-modal-header">
          <h3 className="pos-modal-title">Simpan Pesanan</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">✕</button>
        </div>
        <form className="pos-modal-body" onSubmit={handleSubmit}>
          {error && <div className="form-error-alert">{error}</div>}
          <div className="form-group">
            <label className="form-label">Nama Pelanggan (Opsional)</label>
            <input
              autoFocus
              type="text"
              className="form-input"
              placeholder="Kosongkan untuk Umum"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </div>
          <div className="pos-modal-footer">
            <button type="button" className="pos-btn-secondary" onClick={onClose} disabled={isSaving}>Batal</button>
            <button type="submit" className="pos-btn-primary" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan Pesanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Triwara POS — Add Category Modal Dialog (No Prompts/Alerts)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';

interface CategoryModalProps {
  title: string;
  subtitle?: string;
  placeholder?: string;
  onClose: () => void;
  onSave: (categoryName: string) => Promise<void>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  title,
  subtitle = 'Masukkan nama kategori baru ke dalam sistem',
  placeholder = 'contoh: Camilan, Manual Brew, Sirup...',
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Nama kategori tidak boleh kosong');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="master-modal-card"
        style={{ maxWidth: '400px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <div>
            <h3 className="master-modal-title">{title}</h3>
            <span className="master-modal-subtitle">{subtitle}</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="master-modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">Nama Kategori</label>
            <input
              type="text"
              className="form-input"
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="master-modal-footer" style={{ margin: '16px -20px -20px -20px' }}>
            <button type="button" className="master-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className="master-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Triwara POS — Reusable Dialog Modal (Alert & Confirm)
// ═══════════════════════════════════════════════

import React from 'react';

export interface DialogModalProps {
  isOpen: boolean;
  type?: 'alert' | 'confirm';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DialogModal: React.FC<DialogModalProps> = ({
  isOpen,
  type = 'alert',
  title,
  message,
  confirmText = type === 'confirm' ? 'Ya, Lanjutkan' : 'Mengerti',
  cancelText = 'Batal',
  isDanger = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="dialog-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-modal-header">
          <h3 className="dialog-modal-title" style={{ color: isDanger ? '#f87171' : '#fafafa' }}>
            {isDanger ? '⚠️ ' : type === 'confirm' ? '❓ ' : 'ℹ️ '}
            {title}
          </h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <div className="dialog-modal-body">
          {message}
        </div>

        <div className="dialog-modal-footer">
          {type === 'confirm' && (
            <button type="button" className="dialog-btn-cancel" onClick={onClose}>
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`dialog-btn-confirm ${isDanger ? 'danger' : ''}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

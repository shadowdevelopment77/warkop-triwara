// ═══════════════════════════════════════════════
// Triwara POS — Supervisor / Owner PIN Authorization Modal
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import { staffService } from '../../services/staff.service';
import { configService } from '../../services/config.service';

interface SupervisorPinModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  title = 'Otorisasi Supervisor / Owner',
  message = 'Menu ini memerlukan izin Owner. Masukkan 4 digit PIN Owner untuk melanjutkan.',
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Always reset PIN and error states whenever modal opens or closes
  React.useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsShaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = async (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        try {
          const staff = await staffService.authenticate(newPin);
          if (staff && staff.role === 'owner') {
            onSuccess();
            onClose();
            return;
          }

          // Fallback verify master PIN in config
          const isMasterPin = await configService.verifyPin(newPin);
          if (isMasterPin) {
            onSuccess();
            onClose();
            return;
          }

          triggerError('PIN bukan milik Owner / Supervisor. Akses ditolak.');
        } catch {
          triggerError('Gagal memverifikasi PIN');
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setPin('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`pin-lock-card ${isShaking ? 'shake' : ''}`}
        style={{ maxWidth: '380px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '18px' }}>🔒</span>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <div className="pin-lock-brand" style={{ marginTop: '8px' }}>
          <h3 style={{ color: '#fafafa', fontSize: '18px', margin: '0 0 6px 0', fontWeight: 800 }}>
            {title}
          </h3>
          <p style={{ color: '#a1a1aa', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
            {message}
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="pin-dots-container" style={{ margin: '20px 0 10px 0' }}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={`pin-dot ${index < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {errorMsg && <p className="pin-error-text" style={{ fontSize: '12px' }}>{errorMsg}</p>}

        {/* Numpad Grid */}
        <div className="pin-numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button key={num} type="button" className="numpad-btn" onClick={() => handleKeyPress(num)}>
              {num}
            </button>
          ))}
          <button type="button" className="numpad-btn action" onClick={handleClear}>
            C
          </button>
          <button type="button" className="numpad-btn" onClick={() => handleKeyPress('0')}>
            0
          </button>
          <button type="button" className="numpad-btn action" onClick={handleDelete}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};

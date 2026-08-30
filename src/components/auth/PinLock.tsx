// ═══════════════════════════════════════════════
// Triwara POS — 4-Digit Security PIN Lock Screen
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IStaff } from '../../types';
import { configService } from '../../services/config.service';
import { staffService } from '../../services/staff.service';

interface PinLockProps {
  appName: string;
  appLogo?: string;
  onUnlocked: (staff: IStaff) => void;
}

export const PinLock: React.FC<PinLockProps> = ({ appName, appLogo, onUnlocked }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleKeyPress = async (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        try {
          const staff = await staffService.authenticate(newPin);
          if (staff) {
            onUnlocked(staff);
            return;
          }

          // Fallback to configService master PIN
          const isValid = await configService.verifyPin(newPin);
          if (isValid) {
            const fallbackOwner: IStaff = {
              name: 'Owner Toko',
              pin: newPin,
              role: 'owner',
              active: true,
              createdAt: new Date(),
            };
            onUnlocked(fallbackOwner);
          } else {
            triggerError('PIN Salah. Coba lagi (Owner: 0000 | Kasir: 1234)');
          }
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
    <div className="pin-lock-overlay">
      <div className={`pin-lock-card ${isShaking ? 'shake' : ''}`}>
        <div className="pin-lock-brand">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="pin-brand-logo" />
          ) : (
            <div className="pin-brand-avatar">TP</div>
          )}
          <h2 className="pin-brand-title">{appName || 'Triwara POS'}</h2>
          <p className="pin-brand-subtitle">Masukkan 4 Digit PIN Keamanan</p>
        </div>

        {/* PIN Indicators */}
        <div className="pin-dots-container">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={`pin-dot ${index < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {errorMsg && <p className="pin-error-text">{errorMsg}</p>}

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

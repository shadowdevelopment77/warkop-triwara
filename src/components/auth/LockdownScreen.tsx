// ═══════════════════════════════════════════════
// Triwara POS — Secure Offline Lockdown Screen
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import { licenseService, type ILicenseInfo } from '../../services/license.service';
import { backupService } from '../../services/backup.service';

interface LockdownScreenProps {
  licenseInfo: ILicenseInfo;
  appName?: string;
  appLogo?: string;
}

export const LockdownScreen: React.FC<LockdownScreenProps> = ({
  licenseInfo,
  appName = 'Triwara POS',
  appLogo,
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await backupService.exportDatabase();
      setFeedback({
        type: 'success',
        text: 'Berkas cadangan data (.json) berhasil diunduh ke perangkat Anda.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: 'Gagal mengunduh cadangan data: ' + (err as Error).message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) return;

    const res = licenseService.activateCode(activationCode);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setIsInputModalOpen(false);
      setActivationCode('');
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleExitSimulation = () => {
    licenseService.toggleSimulatedLock(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #dc2626',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)',
          padding: '32px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Brand / Logo */}
        {appLogo ? (
          <img
            src={appLogo}
            alt={appName}
            style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            🔒
          </div>
        )}

        <div>
          <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {appName} — Akses Terbatas
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '6px 0 0 0' }}>
            Masa Aktif Aplikasi Berakhir
          </h2>
        </div>

        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
          {licenseInfo.lockReason === 'clock_rollback' ? (
            'Terdeteksi ketidaksesuaian tanggal perangkat. Harap periksa dan sesuaikan jam perangkat Anda ke waktu sebenarnya.'
          ) : licenseInfo.stage === 'tempo_1' ? (
            'Masa tenggang pembayaran Cicilan 1 telah berakhir. Harap selesaikan pembayaran cicilan Anda ke pihak pengembang agar aplikasi dapat kembali beroperasi.'
          ) : (
            'Masa tenggang pembayaran Pelunasan telah berakhir. Harap selesaikan pelunasan akhir Anda ke pihak pengembang agar aplikasi dapat kembali beroperasi.'
          )}
        </p>

        {feedback && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: feedback.type === 'success' ? '#14532d' : '#7f1d1d',
              color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
              border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
            }}
          >
            {feedback.text}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => setIsInputModalOpen(true)}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            🔑 Masukkan Kode Aktivasi
          </button>

          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isExporting ? '⏳ Mengunduh...' : '💾 Unduh Cadangan Data (.json)'}
          </button>
        </div>

        {/* Developer simulation exit button */}
        {licenseInfo.isSimulatedLock && (
          <button
            type="button"
            onClick={handleExitSimulation}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '11px',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            🧪 Keluar dari Mode Simulasi Uji Coba (Dev Mode)
          </button>
        )}
      </div>

      {/* Activation Input Modal */}
      {isInputModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000000,
          }}
          onClick={() => setIsInputModalOpen(false)}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #475569',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#ffffff' }}>
              Verifikasi Kode Aktivasi
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Masukkan kode perpanjangan atau pelunasan yang diberikan oleh pihak developer pengembang Triwara POS.
            </p>

            <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Contoh: TRW-OKT-2026"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                autoFocus
                style={{
                  height: '42px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #64748b',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '0 12px',
                  fontSize: '14px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  style={{
                    flex: 1,
                    height: '38px',
                    backgroundColor: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: '38px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Aktifkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Triwara POS — Modular Settings Panel (4 Modals)
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IShopConfig } from '../../types';
import { configService } from '../../services/config.service';
import { notificationService } from '../../services/notification.service';
import { compressImage } from '../../utils/image';

type SettingModalType = 'pin' | 'printer' | 'receipt' | 'branding' | null;

export const SettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<IShopConfig | null>(null);
  const [activeModal, setActiveModal] = useState<SettingModalType>(null);

  // Security PIN states
  const [oldPin, setOldPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [pinMsg, setPinMsg] = useState<string>('');

  // Receipt lines
  const [h1, setH1] = useState<string>('');
  const [h2, setH2] = useState<string>('');
  const [h3, setH3] = useState<string>('');
  const [f1, setF1] = useState<string>('');
  const [f2, setF2] = useState<string>('');
  const [f3, setF3] = useState<string>('');
  const [f4, setF4] = useState<string>('');

  // Branding
  const [appName, setAppName] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const loadConfig = async () => {
    const cfg = await configService.getConfig();
    setConfig(cfg);
    setAppName(cfg.appName || 'Triwara POS');
    setH1(cfg.receiptHeaderLines[0] || '');
    setH2(cfg.receiptHeaderLines[1] || '');
    setH3(cfg.receiptHeaderLines[2] || '');
    setF1(cfg.receiptFooterLines[0] || '');
    setF2(cfg.receiptFooterLines[1] || '');
    setF3(cfg.receiptFooterLines[2] || '');
    setF4(cfg.receiptFooterLines[3] || '');
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg('');
    try {
      await configService.updatePin(oldPin, newPin);
      await notificationService.addNotification(
        'PIN Diperbarui',
        'PIN keamanan aplikasi berhasil diubah.',
        'alert',
        'settings' as any
      );
      setOldPin('');
      setNewPin('');
      setActiveModal(null);
      setFeedbackMsg('PIN keamanan berhasil diperbarui');
    } catch (err) {
      setPinMsg((err as Error).message);
    }
  };

  const handleSaveReceiptConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.updateConfig({
        receiptHeaderLines: [h1, h2, h3].filter((l) => l.trim().length > 0),
        receiptFooterLines: [f1, f2, f3, f4].filter((l) => l.trim().length > 0),
      });
      await notificationService.addNotification(
        'Format Struk Diperbarui',
        'Konfigurasi header dan footer struk pelanggan berhasil disimpan.',
        'alert',
        'settings' as any
      );
      setActiveModal(null);
      setFeedbackMsg('Pengaturan struk berhasil disimpan');
      loadConfig();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configService.updateConfig({ appName: appName.trim() });
      await notificationService.addNotification(
        'Branding Diperbarui',
        `Nama kedai diubah menjadi "${appName.trim()}".`,
        'alert',
        'settings' as any
      );
      setActiveModal(null);
      setFeedbackMsg('Nama aplikasi berhasil diperbarui');
      loadConfig();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUploadAppLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImage(e.target.files[0], 120, 120, 0.7);
        await configService.updateConfig({ appLogoBase64: compressed });
        setConfig((prev) => (prev ? { ...prev, appLogoBase64: compressed } : null));
        alert('Logo aplikasi berhasil diupload & dikompres');
      } catch (err) {
        alert('Gagal mengupload logo: ' + (err as Error).message);
      }
    }
  };

  const handleUploadReceiptLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImage(e.target.files[0], 200, 100, 0.7);
        await configService.updateConfig({ receiptLogoBase64: compressed });
        setConfig((prev) => (prev ? { ...prev, receiptLogoBase64: compressed } : null));
        alert('Logo struk berhasil diupload & dikompres');
      } catch (err) {
        alert('Gagal mengupload logo: ' + (err as Error).message);
      }
    }
  };

  return (
    <div className="master-view-container">
      <div className="master-view-header">
        <div>
          <h2 className="view-title">Pengaturan Aplikasi &amp; Perangkat</h2>
          <p className="view-subtitle">Pilih modul pengaturan yang ingin dikonfigurasi.</p>
        </div>
      </div>

      {feedbackMsg && <div className="form-success-alert">{feedbackMsg}</div>}

      {/* 4 Menu Cards Dashboard */}
      <div className="settings-menu-grid">
        <button
          type="button"
          className="setting-trigger-card"
          onClick={() => {
            setPinMsg('');
            setActiveModal('pin');
          }}
        >
          <div className="setting-card-info">
            <h3 className="setting-card-title">1. Ganti PIN Keamanan</h3>
            <p className="setting-card-desc">Ubah 4 digit kode otorisasi akses master &amp; kasir</p>
          </div>
          <span className="setting-card-arrow">➔</span>
        </button>

        <button
          type="button"
          className="setting-trigger-card"
          onClick={() => setActiveModal('printer')}
        >
          <div className="setting-card-info">
            <h3 className="setting-card-title">2. Koneksi Printer Thermal</h3>
            <p className="setting-card-desc">Atur sambungan Bluetooth printer kasir (BT-58D)</p>
          </div>
          <span className="setting-card-arrow">➔</span>
        </button>

        <button
          type="button"
          className="setting-trigger-card"
          onClick={() => setActiveModal('receipt')}
        >
          <div className="setting-card-info">
            <h3 className="setting-card-title">3. Konfigurasi Struk Pelanggan</h3>
            <p className="setting-card-desc">Atur 3 baris header &amp; 4 baris footer (WiFi/Password)</p>
          </div>
          <span className="setting-card-arrow">➔</span>
        </button>

        <button
          type="button"
          className="setting-trigger-card"
          onClick={() => setActiveModal('branding')}
        >
          <div className="setting-card-info">
            <h3 className="setting-card-title">4. Branding Identitas Aplikasi</h3>
            <p className="setting-card-desc">Ubah nama kedai warkop &amp; upload logo aplikasi</p>
          </div>
          <span className="setting-card-arrow">➔</span>
        </button>

        <button
          type="button"
          className="setting-trigger-card"
          style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
          onClick={async () => {
            if (
              confirm(
                'Reset seluruh database dan isi ulang dengan 8 menu siap jual, bahan baku lengkap, serta 400 transaksi demo dalam 1 bulan terakhir?'
              )
            ) {
              try {
                const { resetAndSeedDatabase } = await import('../../database/seed');
                await resetAndSeedDatabase();
                await loadConfig();
                alert('Database berhasil direset dan diisi dengan 400 transaksi demo!');
                window.location.reload();
              } catch (err) {
                alert('Gagal mereset database: ' + (err as Error).message);
              }
            }
          }}
        >
          <div className="setting-card-info">
            <h3 className="setting-card-title" style={{ color: '#ef4444' }}>
              5. Reset &amp; Muat Data Demo (400 Transaksi)
            </h3>
            <p className="setting-card-desc">
              Reset database bersih + 8 menu + inventori stok aman + 400 order 1 bulan
            </p>
          </div>
          <span className="setting-card-arrow" style={{ color: '#ef4444' }}>
            ⚡
          </span>
        </button>
      </div>

      {/* Modal 1: Ganti PIN */}
      {activeModal === 'pin' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Ganti PIN Keamanan</h3>
                <span className="modal-subtitle">Gunakan 4 digit angka rahasia</span>
              </div>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePin} className="modal-body">
              {pinMsg && <div className="form-error-alert">{pinMsg}</div>}

              <div className="form-group">
                <label className="form-label">PIN Lama (Saat Ini)</label>
                <input
                  type="password"
                  maxLength={4}
                  className="form-input"
                  placeholder="****"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">PIN Baru (4 Digit)</label>
                <input
                  type="password"
                  maxLength={4}
                  className="form-input"
                  placeholder="****"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setActiveModal(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan PIN Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Koneksi Printer Thermal */}
      {activeModal === 'printer' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Koneksi Printer Thermal</h3>
                <span className="modal-subtitle">Protokol Bluetooth Classic (SPP) 58mm</span>
              </div>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ backgroundColor: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status Koneksi:</p>
                <strong style={{ fontSize: '15px', color: '#fafafa' }}>
                  {config?.printerMacAddress ? `Terhubung (${config.printerName || 'Xantri BT-58D'})` : 'Belum Dihubungkan'}
                </strong>
                {config?.printerMacAddress && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    MAC: {config.printerMacAddress}
                  </p>
                )}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Printer thermal 58mm (Xantri BT-58D) menggunakan protokol Serial Bluetooth Classic (SPP). Fitur pairing otomatis dan scan aktif langsung pada aplikasi native Android APK.
              </p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => alert('Pencarian Bluetooth Classic aktif pada environment native Capacitor Android.')}
              >
                Scan &amp; Pasangkan Printer
              </button>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setActiveModal(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Konfigurasi Struk Pelanggan */}
      {activeModal === 'receipt' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Konfigurasi Struk Pelanggan</h3>
                <span className="modal-subtitle">Header, footer, logo &amp; info WiFi warkop</span>
              </div>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReceiptConfig} className="modal-body">
              <div className="form-group">
                <label className="form-label">Logo Struk Thermal (Header)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {config?.receiptLogoBase64 ? (
                    <img src={config.receiptLogoBase64} alt="Receipt Logo" style={{ height: '40px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Belum ada logo struk</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadReceiptLogo} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Header Struk (Maksimal 3 Baris):</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Header 1 (cth: Warkop Triwara)"
                  value={h1}
                  onChange={(e) => setH1(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Header 2 (cth: Jl. Contoh No. 123)"
                  value={h2}
                  onChange={(e) => setH2(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Header 3 (cth: Telp: 0812-3456-7890)"
                  value={h3}
                  onChange={(e) => setH3(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Struk (4 Baris - Termasuk WiFi &amp; Password):</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Footer 1 (cth: Terima Kasih Atas Kunjungan Anda)"
                  value={f1}
                  onChange={(e) => setF1(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Footer 2 (cth: Follow Instagram @warkoptriwara)"
                  value={f2}
                  onChange={(e) => setF2(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Footer 3 (cth: WiFi: WarkopTriwara_Free)"
                  value={f3}
                  onChange={(e) => setF3(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Footer 4 (cth: Password: kopienakbanget)"
                  value={f4}
                  onChange={(e) => setF4(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setActiveModal(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Konfigurasi Struk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Branding Identitas Aplikasi */}
      {activeModal === 'branding' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Branding Identitas Aplikasi</h3>
                <span className="modal-subtitle">Nama aplikasi dan logo header kasir</span>
              </div>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="modal-body">
              <div className="form-group">
                <label className="form-label">Logo Utama Aplikasi (Top Bar Header)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {config?.appLogoBase64 ? (
                    <img src={config.appLogoBase64} alt="App Logo" style={{ width: '40px', height: '40px', borderRadius: '6px' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Belum ada logo aplikasi</span>
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadAppLogo} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Aplikasi Toko</label>
                <input
                  type="text"
                  className="form-input"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setActiveModal(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Branding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

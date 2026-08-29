// ═══════════════════════════════════════════════
// Triwara POS — Application Settings & Branding Panel
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IShopConfig } from '../../types';
import { configService } from '../../services/config.service';
import { compressImage } from '../../utils/image';

export const SettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<IShopConfig | null>(null);

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
  const [saveMsg, setSaveMsg] = useState<string>('');

  useEffect(() => {
    configService.getConfig().then((cfg) => {
      setConfig(cfg);
      setAppName(cfg.appName || 'Triwara POS');
      setH1(cfg.receiptHeaderLines[0] || '');
      setH2(cfg.receiptHeaderLines[1] || '');
      setH3(cfg.receiptHeaderLines[2] || '');
      setF1(cfg.receiptFooterLines[0] || '');
      setF2(cfg.receiptFooterLines[1] || '');
      setF3(cfg.receiptFooterLines[2] || '');
      setF4(cfg.receiptFooterLines[3] || '');
    });
  }, []);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg('');
    try {
      await configService.updatePin(oldPin, newPin);
      setPinMsg('PIN keamanan berhasil diperbarui');
      setOldPin('');
      setNewPin('');
    } catch (err) {
      setPinMsg((err as Error).message);
    }
  };

  const handleSaveReceiptConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg('');
    try {
      await configService.updateConfig({
        receiptHeaderLines: [h1, h2, h3].filter((l) => l.trim().length > 0),
        receiptFooterLines: [f1, f2, f3, f4].filter((l) => l.trim().length > 0),
      });
      setSaveMsg('Pengaturan struk berhasil disimpan');
    } catch (err) {
      setSaveMsg((err as Error).message);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg('');
    try {
      await configService.updateConfig({ appName: appName.trim() });
      setSaveMsg('Nama aplikasi berhasil diperbarui');
    } catch (err) {
      setSaveMsg((err as Error).message);
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
          <p className="view-subtitle">Kelola PIN keamanan, koneksi printer thermal, branding toko, &amp; header/footer struk.</p>
        </div>
      </div>

      {saveMsg && <div className="form-success-alert">{saveMsg}</div>}

      {/* Security PIN Change Box */}
      <div className="settings-section-card">
        <h3 className="section-card-title">GANTI PIN KEAMANAN (4 DIGIT)</h3>
        {pinMsg && <div className="form-alert">{pinMsg}</div>}

        <form onSubmit={handleUpdatePin} className="settings-form">
          <div className="form-row two-cols">
            <div className="form-group">
              <label className="form-label">PIN Saat Ini</label>
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
          </div>

          <button type="submit" className="btn-primary">
            Simpan PIN Baru
          </button>
        </form>
      </div>

      {/* Bluetooth Printer Setup Box */}
      <div className="settings-section-card">
        <h3 className="section-card-title">KONEKSI PRINTER THERMAL BLUETOOTH</h3>
        <div className="printer-status-box">
          <p>
            Status Printer: <strong>{config?.printerMacAddress ? `Terhubung (${config.printerName || 'Xantri BT-58D'})` : 'Belum Dihubungkan'}</strong>
          </p>
          {config?.printerMacAddress && <small>MAC Address: {config.printerMacAddress}</small>}
          <div className="printer-actions-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => alert('Fitur Bluetooth scanning aktif pada native build APK di device Android.')}
            >
              Cari &amp; Hubungkan Printer BT-58D
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Customization Box */}
      <div className="settings-section-card">
        <h3 className="section-card-title">KONFIGURASI STRUK PELANGGAN</h3>

        <div className="logo-upload-box">
          <label className="form-label">Logo Struk Pelanggan (Header)</label>
          <div className="logo-preview-row">
            {config?.receiptLogoBase64 ? (
              <img src={config.receiptLogoBase64} alt="Receipt Logo" className="logo-preview-img" />
            ) : (
              <span className="no-logo-text">Belum ada logo</span>
            )}
            <input type="file" accept="image/*" onChange={handleUploadReceiptLogo} />
          </div>
        </div>

        <form onSubmit={handleSaveReceiptConfig} className="settings-form">
          <h4 className="sub-section-title">Baris Header Struk (Max 3 Baris):</h4>
          <input
            type="text"
            className="form-input mb-2"
            placeholder="Header 1 (cth: Warkop Triwara)"
            value={h1}
            onChange={(e) => setH1(e.target.value)}
          />
          <input
            type="text"
            className="form-input mb-2"
            placeholder="Header 2 (cth: Jl. Contoh No. 123, Bali)"
            value={h2}
            onChange={(e) => setH2(e.target.value)}
          />
          <input
            type="text"
            className="form-input mb-4"
            placeholder="Header 3 (cth: Telp: 0812-3456-7890)"
            value={h3}
            onChange={(e) => setH3(e.target.value)}
          />

          <h4 className="sub-section-title">Baris Footer Struk (4 Baris - Termasuk WiFi):</h4>
          <input
            type="text"
            className="form-input mb-2"
            placeholder="Footer 1 (cth: Terima Kasih!)"
            value={f1}
            onChange={(e) => setF1(e.target.value)}
          />
          <input
            type="text"
            className="form-input mb-2"
            placeholder="Footer 2 (cth: Sampai Jumpa Kembali)"
            value={f2}
            onChange={(e) => setF2(e.target.value)}
          />
          <input
            type="text"
            className="form-input mb-2"
            placeholder="Footer 3 (cth: WiFi: WarkopTriwara)"
            value={f3}
            onChange={(e) => setF3(e.target.value)}
          />
          <input
            type="text"
            className="form-input mb-4"
            placeholder="Footer 4 (cth: Pass: kopi12345)"
            value={f4}
            onChange={(e) => setF4(e.target.value)}
          />

          <button type="submit" className="btn-primary">
            Simpan Konfigurasi Struk
          </button>
        </form>
      </div>

      {/* App Branding Box */}
      <div className="settings-section-card">
        <h3 className="section-card-title">BRANDING IDENTITAS APLIKASI</h3>

        <div className="logo-upload-box mb-4">
          <label className="form-label">Logo Aplikasi (Header Kiri Top Bar)</label>
          <div className="logo-preview-row">
            {config?.appLogoBase64 ? (
              <img src={config.appLogoBase64} alt="App Logo" className="logo-preview-img" />
            ) : (
              <span className="no-logo-text">Belum ada logo</span>
            )}
            <input type="file" accept="image/*" onChange={handleUploadAppLogo} />
          </div>
        </div>

        <form onSubmit={handleSaveBranding} className="settings-form">
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

          <button type="submit" className="btn-primary">
            Simpan Nama Aplikasi
          </button>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Triwara POS — Modular Settings Panel (4 Modals)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import type { IShopConfig, IStaff } from '../../types';
import { configService } from '../../services/config.service';
import { notificationService } from '../../services/notification.service';
import { compressImage } from '../../utils/image';
import { DialogModal } from '../common/DialogModal';
import { StaffManagerModal } from './StaffManagerModal';

type SettingModalType = 'printer' | 'receipt' | 'bluetooth' | 'branding' | null;

interface SettingsPanelProps {
  currentUser: IStaff;
  onRequestSupervisorAccess: (onSuccess: () => void) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentUser,
  onRequestSupervisorAccess,
}) => {
  const [config, setConfig] = useState<IShopConfig | null>(null);
  const [activeModal, setActiveModal] = useState<SettingModalType>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const appFileInputRef = useRef<HTMLInputElement>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title: string;
    message: string;
    isDanger?: boolean;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isOwner = currentUser.role === 'owner';

  const guardOwnerAction = (action: () => void) => {
    if (isOwner) {
      action();
    } else {
      onRequestSupervisorAccess(action);
    }
  };

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
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Menyimpan',
        message: (err as Error).message,
        onConfirm: () => {},
      });
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
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Menyimpan',
        message: (err as Error).message,
        onConfirm: () => {},
      });
    }
  };

  const handleUploadAppLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImage(e.target.files[0], 120, 120, 0.7);
        await configService.updateConfig({ appLogoBase64: compressed });
        setConfig((prev) => (prev ? { ...prev, appLogoBase64: compressed } : null));
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Upload Sukses',
          message: 'Logo aplikasi berhasil diupload & dikompres.',
          onConfirm: () => {},
        });
      } catch (err) {
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Gagal Upload',
          message: 'Gagal mengupload logo: ' + (err as Error).message,
          onConfirm: () => {},
        });
      }
    }
  };

  const handleUploadReceiptLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const compressed = await compressImage(e.target.files[0], 200, 100, 0.7);
        await configService.updateConfig({ receiptLogoBase64: compressed });
        setConfig((prev) => (prev ? { ...prev, receiptLogoBase64: compressed } : null));
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Upload Sukses',
          message: 'Logo struk kasir berhasil diupload & dikompres.',
          onConfirm: () => {},
        });
      } catch (err) {
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Gagal Upload',
          message: 'Gagal mengupload logo: ' + (err as Error).message,
          onConfirm: () => {},
        });
      }
    }
  };

  const handleDeleteReceiptLogo = () => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Hapus Logo Struk?',
      message: 'Apakah Anda yakin ingin menghapus logo struk thermal kasir? Struk selanjutnya akan dicetak tanpa gambar logo.',
      isDanger: true,
      confirmText: 'Ya, Hapus Logo',
      onConfirm: async () => {
        try {
          await configService.updateConfig({ receiptLogoBase64: undefined });
          setConfig((prev) => (prev ? { ...prev, receiptLogoBase64: undefined } : null));
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Logo Dihapus',
            message: 'Logo struk kasir berhasil dihapus.',
            onConfirm: () => {},
          });
        } catch (err) {
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Gagal Menghapus',
            message: (err as Error).message,
            onConfirm: () => {},
          });
        }
      },
    });
  };

  const handleDeleteAppLogo = () => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Hapus Logo Aplikasi?',
      message: 'Apakah Anda yakin ingin menghapus logo header aplikasi?',
      isDanger: true,
      confirmText: 'Ya, Hapus Logo',
      onConfirm: async () => {
        try {
          await configService.updateConfig({ appLogoBase64: undefined });
          setConfig((prev) => (prev ? { ...prev, appLogoBase64: undefined } : null));
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Logo Dihapus',
            message: 'Logo header aplikasi berhasil dihapus.',
            onConfirm: () => {},
          });
        } catch (err) {
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Gagal Menghapus',
            message: (err as Error).message,
            onConfirm: () => {},
          });
        }
      },
    });
  };

  return (
    <div className="settings-view-container">
      <div className="settings-view-header">
        <div>
          <h2 className="settings-view-title">Pengaturan Aplikasi &amp; Perangkat</h2>
        </div>
      </div>

      {feedbackMsg && <div className="form-success-alert">{feedbackMsg}</div>}

      {/* 5 Settings Cards Dashboard */}
      <div className="settings-menu-grid">
        {/* 1. Koneksi Printer Thermal (Open to all) */}
        <button
          type="button"
          className="settings-trigger-card"
          onClick={() => setActiveModal('printer')}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title">Koneksi Printer Thermal</h3>
            <p className="settings-card-desc">Atur sambungan Bluetooth printer kasir (BT-58D)</p>
          </div>
          <span className="settings-card-arrow">➔</span>
        </button>

        {/* 2. Kelola Karyawan & Hak Akses PIN (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          onClick={() => guardOwnerAction(() => setIsStaffModalOpen(true))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title">
              {isOwner ? 'Kelola Karyawan & Hak Akses PIN' : 'Kelola Karyawan & Hak Akses PIN (Owner)'}
            </h3>
            <p className="settings-card-desc">Tambah kasir baru, update nama staf, dan ganti PIN</p>
          </div>
          <span className="settings-card-arrow">{isOwner ? '➔' : '🔒'}</span>
        </button>

        {/* 3. Konfigurasi Struk Pelanggan (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          onClick={() => guardOwnerAction(() => setActiveModal('receipt'))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title">
              {isOwner ? 'Konfigurasi Struk Pelanggan' : 'Konfigurasi Struk Pelanggan (Owner)'}
            </h3>
            <p className="settings-card-desc">Atur 3 baris header &amp; 4 baris footer (WiFi/Password)</p>
          </div>
          <span className="settings-card-arrow">{isOwner ? '➔' : '🔒'}</span>
        </button>

        {/* 4. Branding Identitas Aplikasi (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          onClick={() => guardOwnerAction(() => setActiveModal('branding'))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title">
              {isOwner ? 'Branding Identitas Aplikasi' : 'Branding Identitas Aplikasi (Owner)'}
            </h3>
            <p className="settings-card-desc">Ubah nama kedai warkop &amp; upload logo aplikasi</p>
          </div>
          <span className="settings-card-arrow">{isOwner ? '➔' : '🔒'}</span>
        </button>

        {/* 5. Reset & Muat Data Demo (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
          onClick={() => {
            guardOwnerAction(() => {
              setDialogConfig({
                isOpen: true,
                type: 'confirm',
                title: 'Reset Seluruh Database?',
                message:
                  'PERINGATAN: Semua data transaksi, menu, dan inventori akan direset dan diisi ulang dengan 8 menu siap jual serta 400 transaksi demo dalam 1 bulan terakhir.\n\nApakah Anda yakin ingin melanjutkan?',
                isDanger: true,
                confirmText: 'Ya, Reset Database',
                onConfirm: async () => {
                  try {
                    const { resetAndSeedDatabase } = await import('../../database/seed');
                    await resetAndSeedDatabase();
                    window.location.reload();
                  } catch (err) {
                    setDialogConfig({
                      isOpen: true,
                      type: 'alert',
                      title: 'Gagal Reset',
                      message: 'Gagal mereset database: ' + (err as Error).message,
                      onConfirm: () => {},
                    });
                  }
                },
              });
            });
          }}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title" style={{ color: '#f87171' }}>
              {isOwner ? 'Reset & Muat Data Demo' : 'Reset & Muat Data Demo (Owner)'}
            </h3>
            <p className="settings-card-desc">
              Reset database bersih + 8 menu + inventori stok aman + 400 order 1 bulan
            </p>
          </div>
          <span className="settings-card-arrow" style={{ color: '#ef4444' }}>
            {isOwner ? '⚡' : '🔒'}
          </span>
        </button>
      </div>

      {/* Modal 2: Koneksi Printer Thermal */}
      {activeModal === 'printer' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Koneksi Printer Thermal</h3>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <div className="settings-modal-body">
              <div style={{ backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status Koneksi:</p>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                  {config?.printerMacAddress ? `Terhubung (${config.printerName || 'Xantri BT-58D'})` : 'Belum Dihubungkan'}
                </strong>
                {config?.printerMacAddress && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    MAC: {config.printerMacAddress}
                  </p>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Triwara POS mendukung printer kasir thermal Bluetooth 58mm dengan command set ESC/POS.
              </p>

              <button
                type="button"
                className="settings-btn-primary"
                onClick={() =>
                  setDialogConfig({
                    isOpen: true,
                    type: 'alert',
                    title: 'Pencarian Bluetooth',
                    message: 'Pastikan Bluetooth perangkat menyala dan printer thermal BT-58D dalam mode pairing.',
                    onConfirm: () => {},
                  })
                }
              >
                Scan &amp; Pasangkan Printer
              </button>
            </div>

            <div className="settings-modal-footer">
              <button type="button" className="settings-btn-primary" onClick={() => setActiveModal(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Konfigurasi Struk Pelanggan */}
      {activeModal === 'receipt' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Konfigurasi Struk Pelanggan</h3>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReceiptConfig} className="settings-modal-body">
              <div className="form-group">
                <label className="form-label">Logo Struk Thermal (Header)</label>
                <input
                  type="file"
                  ref={receiptFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadReceiptLogo}
                />

                {config?.receiptLogoBase64 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={config.receiptLogoBase64}
                        alt="Receipt Logo"
                        style={{
                          height: '42px',
                          maxWidth: '120px',
                          objectFit: 'contain',
                          backgroundColor: '#ffffff',
                          borderRadius: '4px',
                          padding: '4px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '13px', display: 'block' }}>
                          Logo Struk Aktif
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="settings-btn-secondary"
                        onClick={() => receiptFileInputRef.current?.click()}
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        className="settings-btn-danger"
                        onClick={handleDeleteReceiptLogo}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px dashed #3f3f46',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(24, 24, 27, 0.5)',
                    }}
                  >
                    <div>
                      <span style={{ color: '#a1a1aa', fontSize: '13px', display: 'block' }}>
                        Belum ada logo struk
                      </span>
                      <small style={{ color: '#71717a', fontSize: '11px' }}>
                        Format PNG/JPG (monokrom kontras tinggi lebih jelas)
                      </small>
                    </div>
                    <button
                      type="button"
                      className="settings-btn-primary"
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => receiptFileInputRef.current?.click()}
                    >
                      Pilih Foto
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Header Struk (Maks 3 Baris)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Header 1 (Nama Toko / Kedai)"
                  value={h1}
                  onChange={(e) => setH1(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Header 2 (Alamat Toko)"
                  value={h2}
                  onChange={(e) => setH2(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Header 3 (No Telepon / WhatsApp)"
                  value={h3}
                  onChange={(e) => setH3(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Struk (Maks 4 Baris)</label>
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

              <div className="settings-modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
                <button type="button" className="settings-btn-secondary" onClick={() => setActiveModal(null)}>
                  Batal
                </button>
                <button type="submit" className="settings-btn-primary">
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
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Branding Identitas Aplikasi</h3>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranding} className="settings-modal-body">
              <div className="form-group">
                <label className="form-label">Logo Utama Aplikasi</label>
                <input
                  type="file"
                  ref={appFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadAppLogo}
                />

                {config?.appLogoBase64 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={config.appLogoBase64}
                        alt="App Logo"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          objectFit: 'contain',
                          backgroundColor: '#ffffff',
                          padding: '2px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '13px', display: 'block' }}>
                          Logo Header Aktif
                        </strong>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="settings-btn-secondary"
                        onClick={() => appFileInputRef.current?.click()}
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        className="settings-btn-danger"
                        onClick={handleDeleteAppLogo}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px dashed #3f3f46',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(24, 24, 27, 0.5)',
                    }}
                  >
                    <div>
                      <span style={{ color: '#a1a1aa', fontSize: '13px', display: 'block' }}>
                        Belum ada logo aplikasi
                      </span>
                      <small style={{ color: '#71717a', fontSize: '11px' }}>
                        Format PNG/JPG persegi (disarankan 120x120 px)
                      </small>
                    </div>
                    <button
                      type="button"
                      className="settings-btn-primary"
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => appFileInputRef.current?.click()}
                    >
                      Pilih Foto
                    </button>
                  </div>
                )}
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

              <div className="settings-modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
                <button type="button" className="settings-btn-secondary" onClick={() => setActiveModal(null)}>
                  Batal
                </button>
                <button type="submit" className="settings-btn-primary">
                  Simpan Branding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Management Modal (Owner Only) */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* Reusable Dialog Modal */}
      <DialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        isDanger={dialogConfig.isDanger}
        onConfirm={dialogConfig.onConfirm}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

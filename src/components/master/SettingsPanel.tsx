// ═══════════════════════════════════════════════
// Triwara POS — Modular Settings Panel (4 Modals)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import type { IShopConfig, IStaff } from '../../types';
import { configService } from '../../services/config.service';
import { orderService } from '../../services/order.service';
import { notificationService } from '../../services/notification.service';
import { compressImage } from '../../utils/image';
import { exportOrdersToExcel } from '../../utils/excel';
import { DialogModal } from '../common/DialogModal';
import { StaffManagerModal } from './StaffManagerModal';
import { BackupRestoreModal } from './BackupRestoreModal';
import { printerService } from '../../services/printer.service';
import { licenseService, type ILicenseInfo } from '../../services/license.service';

type SettingModalType = 'printer' | 'receipt' | 'bluetooth' | 'branding' | 'license' | null;

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
  const [isBackupRestoreModalOpen, setIsBackupRestoreModalOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [licenseInfo, setLicenseInfo] = useState<ILicenseInfo>(() => licenseService.getLicenseInfo());
  const [activationInput, setActivationInput] = useState<string>('');
  const [devTapCount, setDevTapCount] = useState<number>(0);

  const handleSecretDevTap = () => {
    const next = devTapCount + 1;
    if (next >= 5) {
      setDevTapCount(0);
      setActiveModal(null);
      licenseService.toggleSimulatedLock(true);
    } else {
      setDevTapCount(next);
      setTimeout(() => setDevTapCount(0), 3000);
    }
  };

  useEffect(() => {
    return licenseService.subscribe((info) => setLicenseInfo(info));
  }, []);

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

  const handleTestPrint = async () => {
    if (!config) return;
    const res = await printerService.testPrint(config);
    if (res.success) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Uji Cetak Terkirim',
        message: `Perintah uji cetak 58mm (${res.bytesSent} bytes) berhasil dikirim ke ${config.printerName || 'Xantri BT-58D'}.`,
        onConfirm: () => {},
      });
    } else {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Uji Cetak Gagal',
        message: res.error || 'Gagal mengirim data ke printer thermal.',
        isDanger: true,
        onConfirm: () => {},
      });
    }
  };

  const handleConnectDefaultPrinter = async () => {
    try {
      await configService.updateConfig({
        printerName: 'Printer Thermal (RawBT)',
        printerMacAddress: 'RAWBT_BLUETOOTH',
      });
      const fresh = await configService.getConfig();
      setConfig(fresh);
      setFeedbackMsg('Layanan Cetak RawBT berhasil diaktifkan.');
      setTimeout(() => setFeedbackMsg(''), 3000);
      if (typeof window !== 'undefined') {
        window.location.href = 'rawbt:';
      }
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Memasangkan Printer',
        message: (err as Error).message,
        onConfirm: () => {},
      });
    }
  };

  const handleDisconnectPrinter = async () => {
    try {
      await configService.updateConfig({
        printerName: undefined,
        printerMacAddress: undefined,
      });
      const fresh = await configService.getConfig();
      setConfig(fresh);
      setFeedbackMsg('Printer berhasil diputuskan.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Memutuskan Printer',
        message: (err as Error).message,
        onConfirm: () => {},
      });
    }
  };

  const handleCleanOldOrders = () => {
    guardOwnerAction(async () => {
      try {
        const oldOrders = await orderService.getOrdersOlderThanOneYear();
        if (oldOrders.length === 0) {
          setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Tidak Ada Transaksi Lama',
            message: 'Saat ini belum ada data transaksi yang berumur 1 tahun atau lebih untuk dibersihkan.',
            onConfirm: () => {},
          });
          return;
        }

        setDialogConfig({
          isOpen: true,
          type: 'confirm',
          title: 'Bersihkan Transaksi Lama (≥ 1 Tahun)?',
          message: `Ditemukan ${oldOrders.length} riwayat transaksi yang berumur 1 tahun atau lebih.\n\nSistem akan MENGUNDUH ARSIP EXCEL (.csv) terlebih dahulu sebelum menghapus data transaksi dari database.\n\nApakah Anda ingin melanjutkan?`,
          isDanger: true,
          confirmText: 'Download Excel & Bersihkan',
          onConfirm: async () => {
            try {
              // 1. Download Excel/CSV first
              const todayStr = new Date().toISOString().split('T')[0];
              exportOrdersToExcel(oldOrders, `Arsip_Transaksi_Triwara_1Tahun_${todayStr}.csv`);

              // 2. Perform backend cleanup
              const result = await orderService.cleanOrdersOlderThanOneYear();

              await notificationService.addNotification(
                'Transaksi Lama Dibersihkan',
                `${result.count} transaksi berumur ≥ 1 tahun berhasil diarsipkan ke Excel dan dibersihkan dari database.`,
                'alert',
                'settings' as any
              );

              setDialogConfig({
                isOpen: true,
                type: 'alert',
                title: 'Pembersihan Sukses',
                message: `Arsip Excel berhasil diunduh dan ${result.count} data transaksi berumur ≥ 1 tahun telah dibersihkan secara aman dari database.`,
                onConfirm: () => {},
              });
            } catch (err) {
              setDialogConfig({
                isOpen: true,
                type: 'alert',
                title: 'Gagal Membersihkan Data',
                message: (err as Error).message,
                onConfirm: () => {},
              });
            }
          },
        });
      } catch (err) {
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Gagal Memeriksa Data',
          message: (err as Error).message,
          onConfirm: () => {},
        });
      }
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

        {/* 5. Bersihkan Riwayat Transaksi (≥ 1 Tahun) */}
        <button
          type="button"
          className="settings-trigger-card"
          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.03)' }}
          onClick={handleCleanOldOrders}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title" style={{ color: '#ef4444' }}>
              {isOwner ? 'Bersihkan Transaksi (≥ 1 Tahun)' : 'Bersihkan Transaksi (≥ 1 Tahun) (Owner)'}
            </h3>
            <p className="settings-card-desc">
              Unduh arsip Excel transaksi lama ≥ 1 tahun lalu bersihkan dari database
            </p>
          </div>
          <span className="settings-card-arrow" style={{ color: '#ef4444' }}>
            {isOwner ? '➔' : '🔒'}
          </span>
        </button>

        {/* 6. Full Database Backup & Restore (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          onClick={() => guardOwnerAction(() => setIsBackupRestoreModalOpen(true))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title">
              {isOwner ? 'Backup & Restore Database' : 'Backup & Restore Database (Owner)'}
            </h3>
            <p className="settings-card-desc">
              Unduh cadangan seluruh data toko (.json) atau pulihkan database ke perangkat ini
            </p>
          </div>
          <span className="settings-card-arrow">{isOwner ? '➔' : '🔒'}</span>
        </button>

        {/* 7. Lisensi (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          onClick={() => guardOwnerAction(() => setActiveModal('license'))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title">
              {isOwner ? 'Lisensi' : 'Lisensi (Owner)'}
            </h3>
            <p className="settings-card-desc">
              {licenseInfo.stage === 'lifetime'
                ? 'Aktif Permanen'
                : 'Status aktivasi sistem'}
            </p>
          </div>
          <span className="settings-card-arrow">{isOwner ? '➔' : '🔒'}</span>
        </button>
      </div>

      {/* Modal 2: Koneksi Printer Thermal */}
      {activeModal === 'printer' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Koneksi Printer Thermal</h3>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <div className="settings-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '14px',
                  borderRadius: '8px',
                  border: `1px solid ${config?.printerMacAddress ? '#86efac' : '#cbd5e1'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Status Koneksi:</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 700,
                      backgroundColor: config?.printerMacAddress ? '#dcfce7' : '#fef3c7',
                      color: config?.printerMacAddress ? '#15803d' : '#b45309',
                    }}
                  >
                    {config?.printerMacAddress ? '● Terhubung' : '○ Belum Dihubungkan'}
                  </span>
                </div>
                <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                  {config?.printerName || 'Xantri Thermal BT-58D'}
                </strong>
                {config?.printerMacAddress ? (
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                    MAC: {config.printerMacAddress}
                  </p>
                ) : (
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                    Belum ada printer yang tersimpan untuk kasir ini.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="settings-btn-primary"
                  style={{ flex: 1, backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                  onClick={handleTestPrint}
                >
                  Uji Cetak Thermal (58mm)
                </button>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  style={{ padding: '0 14px' }}
                  onClick={handleConnectDefaultPrinter}
                >
                  Buka RawBT
                </button>
                {config?.printerMacAddress && (
                  <button
                    type="button"
                    className="settings-btn-danger"
                    style={{ padding: '0 12px' }}
                    onClick={handleDisconnectPrinter}
                  >
                    Reset
                  </button>
                )}
              </div>

              <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                <strong>Panduan Koneksi Printer Kasir (RawBT Service 58mm):</strong>
                <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                  <li>Nyalakan tombol power printer thermal Bluetooth kasir Anda.</li>
                  <li>Buka aplikasi <strong>RawBT</strong> di HP (atau ketuk tombol <em>Buka RawBT</em> di atas).</li>
                  <li>Di RawBT, pilih koneksi <strong>Bluetooth</strong> dan pilih printer Anda (Panda, Xprinter, Iware, Mini POS, dll).</li>
                  <li>Ketuk tombol <strong>Uji Cetak Thermal (58mm)</strong> di atas untuk memverifikasi kertas struk keluar langsung dari mesin printer Anda!</li>
                </ol>
              </div>
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

      {/* Modal 5: Lisensi */}
      {activeModal === 'license' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Lisensi</h3>
              <button type="button" className="modal-close-btn-red" onClick={() => setActiveModal(null)} title="Tutup">
                ✕
              </button>
            </div>

            <div className="settings-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Row 1: Aktivasi Pertama */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{ fontSize: '13px', color: '#475569', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    onClick={handleSecretDevTap}
                  >
                    Aktivasi Pertama
                  </span>
                  {licenseInfo.stage === 'tempo_2' || licenseInfo.stage === 'lifetime' ? (
                    <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '18px' }} title="Aktif">✓</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '18px' }} title="Belum">✕</span>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

                {/* Row 2: Aktivasi Kedua */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                    Aktivasi Kedua
                  </span>
                  {licenseInfo.stage === 'lifetime' ? (
                    <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '18px' }} title="Aktif">✓</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '18px' }} title="Belum">✕</span>
                  )}
                </div>
              </div>

              {licenseInfo.stage !== 'lifetime' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!activationInput.trim()) return;
                    const res = await licenseService.activateCode(activationInput);
                    if (res.success) {
                      setFeedbackMsg(res.message);
                      setActivationInput('');
                    } else {
                      setDialogConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Aktivasi Gagal',
                        message: res.message,
                        isDanger: true,
                        onConfirm: () => {},
                      });
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    Kode Aktivasi
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="settings-input"
                      placeholder="Masukkan kode aktivasi..."
                      value={activationInput}
                      onChange={(e) => setActivationInput(e.target.value)}
                      style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
                    />
                    <button type="submit" className="settings-btn-primary" style={{ padding: '0 16px' }}>
                      Aktifkan
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="settings-modal-footer">
              <button type="button" className="settings-btn-primary" onClick={() => setActiveModal(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management Modal (Owner Only) */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* Full Database Backup & Restore Modal (Owner Only) */}
      <BackupRestoreModal
        isOpen={isBackupRestoreModalOpen}
        onClose={() => setIsBackupRestoreModalOpen(false)}
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

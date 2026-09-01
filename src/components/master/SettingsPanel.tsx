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
import { StressTestModal } from './StressTestModal';
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
  const [isStressTestModalOpen, setIsStressTestModalOpen] = useState<boolean>(false);
  const [isBackupRestoreModalOpen, setIsBackupRestoreModalOpen] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [licenseInfo, setLicenseInfo] = useState<ILicenseInfo>(() => licenseService.getLicenseInfo());
  const [activationInput, setActivationInput] = useState<string>('');

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
        printerName: 'Xantri Thermal BT-58D',
        printerMacAddress: '00:11:22:33:44:55',
      });
      const fresh = await configService.getConfig();
      setConfig(fresh);
      setFeedbackMsg('Printer Xantri BT-58D berhasil dipasangkan.');
      setTimeout(() => setFeedbackMsg(''), 3000);
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
            type: 'confirm',
            title: 'Belum Ada Transaksi ≥ 1 Tahun',
            message:
              'Saat ini seluruh transaksi di database masih berumur < 1 tahun.\n\nApakah Anda ingin membuat 10 transaksi simulasi (bertanggal 400 hari lalu) untuk langsung menguji unduh arsip Excel dan pembersihan database ini?',
            confirmText: '⚡ Buat 10 Data Uji (400 Hari Lalu)',
            onConfirm: async () => {
              try {
                const count = await orderService.generateOldOrdersForTesting(10);
                setDialogConfig({
                  isOpen: true,
                  type: 'alert',
                  title: 'Data Simulasi Siap Diuji',
                  message: `${count} transaksi simulasi berumur 400 hari lalu berhasil dibuat!\n\nSilakan klik lagi tombol "Bersihkan Transaksi (≥ 1 Tahun)" untuk menguji unduh arsip Excel dan pembersihannya.`,
                  onConfirm: () => {},
                });
              } catch (e) {
                setDialogConfig({
                  isOpen: true,
                  type: 'alert',
                  title: 'Gagal Membuat Data Uji',
                  message: (e as Error).message,
                  onConfirm: () => {},
                });
              }
            },
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
          style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}
          onClick={handleCleanOldOrders}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title" style={{ color: '#facc15' }}>
              {isOwner ? 'Bersihkan Transaksi (≥ 1 Tahun)' : 'Bersihkan Transaksi (≥ 1 Tahun) (Owner)'}
            </h3>
            <p className="settings-card-desc">
              Download arsip Excel transaksi lama ≥ 1 tahun lalu bersihkan dari database
            </p>
          </div>
          <span className="settings-card-arrow" style={{ color: '#eab308' }}>
            {isOwner ? '🧹' : '🔒'}
          </span>
        </button>

        {/* 6. Stress Test & Benchmark Generator */}
        <button
          type="button"
          className="settings-trigger-card"
          style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}
          onClick={() => guardOwnerAction(() => setIsStressTestModalOpen(true))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title" style={{ color: '#60a5fa' }}>
              {isOwner ? '⚡ Stress Test & Benchmark' : '⚡ Stress Test & Benchmark (Owner)'}
            </h3>
            <p className="settings-card-desc">
              Uji ketahanan 10.000 s/d 1.000.000 transaksi dummy + live stopwatch latensi
            </p>
          </div>
          <span className="settings-card-arrow" style={{ color: '#3b82f6' }}>
            {isOwner ? '🚀' : '🔒'}
          </span>
        </button>

        {/* 7. Full Database Backup & Restore (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}
          onClick={() => guardOwnerAction(() => setIsBackupRestoreModalOpen(true))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title" style={{ color: '#34d399' }}>
              {isOwner ? '💾 Backup & Restore Database' : '💾 Backup & Restore Database (Owner)'}
            </h3>
            <p className="settings-card-desc">
              Unduh cadangan seluruh data toko (.json) atau pulihkan database ke perangkat ini
            </p>
          </div>
          <span className="settings-card-arrow" style={{ color: '#10b981' }}>
            {isOwner ? '💾' : '🔒'}
          </span>
        </button>

        {/* 8. Lisensi & Aktivasi Aplikasi (Owner only) */}
        <button
          type="button"
          className="settings-trigger-card"
          style={{ borderColor: licenseInfo.stage === 'lifetime' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)' }}
          onClick={() => guardOwnerAction(() => setActiveModal('license'))}
        >
          <div className="settings-card-info">
            <h3 className="settings-card-title" style={{ color: licenseInfo.stage === 'lifetime' ? '#4ade80' : '#facc15' }}>
              🔑 Lisensi &amp; Aktivasi Aplikasi
            </h3>
            <p className="settings-card-desc">
              {licenseInfo.stage === 'lifetime'
                ? '✓ Lisensi Permanen (Aktif Selamanya)'
                : licenseInfo.stage === 'tempo_1'
                ? 'Tempo Cicilan 1 (Batas: 5 Okt 2026)'
                : 'Tempo Cicilan 2 (Batas: 5 Nov 2026)'}
            </p>
          </div>
          <span className="settings-card-arrow" style={{ color: licenseInfo.stage === 'lifetime' ? '#22c55e' : '#eab308' }}>
            {licenseInfo.stage === 'lifetime' ? '✓' : '🔑'}
          </span>
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
                {config?.printerMacAddress ? (
                  <>
                    <button
                      type="button"
                      className="settings-btn-primary"
                      style={{ flex: 1, backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                      onClick={handleTestPrint}
                    >
                      🧪 Uji Cetak Thermal
                    </button>
                    <button
                      type="button"
                      className="settings-btn-danger"
                      style={{ padding: '0 16px' }}
                      onClick={handleDisconnectPrinter}
                    >
                      Putuskan Printer
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="settings-btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleConnectDefaultPrinter}
                  >
                    ⚡ Pasangkan Xantri BT-58D
                  </button>
                )}
              </div>

              <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                <strong>Panduan Printer Kasir (Xantri BT-58D 58mm):</strong>
                <ol style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                  <li>Nyalakan tombol power printer hingga lampu indikator biru/hijau menyala.</li>
                  <li>Di menu Bluetooth HP/Tablet, lakukan pairing perangkat (PIN default: <code>0000</code> atau <code>1234</code>).</li>
                  <li>Klik tombol uji cetak di atas untuk memastikan kertas mencetak dengan benar.</li>
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

      {/* Modal 5: Lisensi & Aktivasi Aplikasi */}
      {activeModal === 'license' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Lisensi &amp; Aktivasi Aplikasi</h3>
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
                  border: `1px solid ${licenseInfo.stage === 'lifetime' ? '#86efac' : '#fde047'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Status Lisensi:</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 700,
                      backgroundColor: licenseInfo.stage === 'lifetime' ? '#dcfce7' : '#fef9c3',
                      color: licenseInfo.stage === 'lifetime' ? '#15803d' : '#a16207',
                    }}
                  >
                    {licenseInfo.stage === 'lifetime'
                      ? '● Permanen (Lifetime)'
                      : licenseInfo.stage === 'tempo_1'
                      ? '● Tempo Cicilan 1'
                      : '● Tempo Cicilan 2'}
                  </span>
                </div>

                <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                  {licenseInfo.stage === 'lifetime'
                    ? 'Aplikasi Terverifikasi Penuh'
                    : licenseInfo.stage === 'tempo_1'
                    ? 'Tenggat Waktu: 5 Oktober 2026'
                    : 'Tenggat Waktu: 5 November 2026'}
                </strong>

                <p style={{ fontSize: '12px', color: '#475569', margin: '6px 0 0 0', lineHeight: '1.5' }}>
                  {licenseInfo.stage === 'lifetime'
                    ? 'Aplikasi ini telah memiliki lisensi permanen aktif selamanya tanpa batas waktu.'
                    : licenseInfo.stage === 'tempo_1'
                    ? 'Aplikasi beroperasi dalam masa tempo cicilan 1. Masukkan kode aktivasi cicilan 1 untuk memperpanjang hingga 5 November 2026.'
                    : '✓ Cicilan 1 Terverifikasi! Silakan masukkan Kode Pelunasan Akhir untuk mengaktifkan lisensi permanen selamanya.'}
                </p>
              </div>

              {licenseInfo.stage !== 'lifetime' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!activationInput.trim()) return;
                    const res = licenseService.activateCode(activationInput);
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
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {licenseInfo.stage === 'tempo_1' ? 'Kode Aktivasi Cicilan 1:' : 'Kode Pelunasan Akhir:'}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="settings-input"
                      placeholder={licenseInfo.stage === 'tempo_1' ? 'TRW-OKT-2026' : 'TRW-LIFETIME-PASS'}
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

              {/* Developer / Owner Manual Test Tool */}
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px dashed #cbd5e1',
                  marginTop: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    🧪 Alat Uji Coba Penguncian (Localhost Test):
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 8px 0', lineHeight: '1.4' }}>
                  Simulasikan tampilan layar terkunci saat jatuh tempo untuk memastikan alur backup dan aktivasi berfungsi dengan baik.
                </p>
                <button
                  type="button"
                  onClick={() => licenseService.toggleSimulatedLock(true)}
                  style={{
                    width: '100%',
                    height: '34px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🔒 Uji Tampilan Terkunci Sekarang
                </button>
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

      {/* Staff Management Modal (Owner Only) */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />

      {/* Stress Test & Benchmark Modal (Owner Only) */}
      <StressTestModal
        isOpen={isStressTestModalOpen}
        onClose={() => setIsStressTestModalOpen(false)}
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

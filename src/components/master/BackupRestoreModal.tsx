// ═══════════════════════════════════════════════
// Triwara POS — Full Database Backup & Restore Modal (Owner Only)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { backupService, type ITriwaraBackupPayload } from '../../services/backup.service';
import { DialogModal } from '../common/DialogModal';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const [currentStats, setCurrentStats] = useState<ITriwaraBackupPayload['stats'] | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ITriwaraBackupPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadStats = useCallback(async () => {
    try {
      const payload = await backupService.exportDatabase();
      setCurrentStats(payload.stats);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setErrorMsg('');
      setSuccessMsg('');
      setSelectedFile(null);
      setParsedPreview(null);
    }
  }, [isOpen, loadStats]);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    try {
      setIsExporting(true);
      setErrorMsg('');
      const fileName = await backupService.downloadBackupFile();
      setSuccessMsg(`File backup "${fileName}" berhasil disimpan di folder Dokumen perangkat.`);
    } catch (err) {
      setErrorMsg(`Gagal membuat backup: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setParsedPreview(null);
      return;
    }

    if (!file.name.endsWith('.json')) {
      setErrorMsg('Harap pilih file dengan ekstensi .json.');
      setSelectedFile(null);
      setParsedPreview(null);
      return;
    }

    setSelectedFile(file);

    // Read and preview contents
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.appName !== 'Triwara POS' || !parsed.data) {
          setErrorMsg('File ini bukan format backup resmi Triwara POS.');
          setParsedPreview(null);
          return;
        }
        setParsedPreview(parsed);
      } catch {
        setErrorMsg('File JSON rusak atau tidak dapat dibaca.');
        setParsedPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!selectedFile || !parsedPreview) return;

    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Peringatan: Timpa Seluruh Database?',
      message:
        'TINDAKAN KRUSIAL: Memulihkan database akan MENGHAPUS SELURUH DATA LOKAL yang ada saat ini dan menggantikannya dengan data dari file backup yang dipilih.\n\nPastikan Anda sudah mencadangkan data saat ini terlebih dahulu jika diperlukan.\n\nApakah Anda yakin ingin melanjutkan?',
      isDanger: true,
      confirmText: 'Ya, Pulihkan Database',
      onConfirm: async () => {
        try {
          setIsRestoring(true);
          setErrorMsg('');

          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const text = ev.target?.result as string;
              const result = await backupService.importDatabase(text);

              setDialogConfig({
                isOpen: true,
                type: 'alert',
                title: 'Pemulihan Berhasil!',
                message: `Database berhasil dipulihkan dari file backup!\n\n• Menu: ${result.stats.products}\n• Bahan: ${result.stats.ingredients}\n• Transaksi: ${result.stats.orders}\n• Shift: ${result.stats.shifts}\n\nAplikasi akan memuat ulang halaman secara otomatis.`,
                onConfirm: () => {
                  window.location.reload();
                },
              });
            } catch (err) {
              setErrorMsg(`Gagal memulihkan database: ${(err as Error).message}`);
            } finally {
              setIsRestoring(false);
            }
          };
          reader.readAsText(selectedFile);
        } catch (err) {
          setErrorMsg(`Terjadi kesalahan: ${(err as Error).message}`);
          setIsRestoring(false);
        }
      },
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="settings-modal-card"
          style={{ maxWidth: '640px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="settings-modal-header">
            <h3 className="settings-modal-title">Backup &amp; Restore Database</h3>
            <button
              type="button"
              className="modal-close-btn-red"
              onClick={onClose}
              title="Tutup"
              disabled={isRestoring || isExporting}
            >
              ✕
            </button>
          </div>

          <div className="settings-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Feedback Banners */}
            {errorMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  lineHeight: '1.4',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#16a34a',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  lineHeight: '1.4',
                }}
              >
                ✅ {successMsg}
              </div>
            )}

            {/* SECTION 1: EXPORT / BACKUP */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                1. Cadangkan Database (Export)
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                Unduh seluruh data toko (Menu, Bahan, Resep HPP, Satuan, Karyawan, Shift, Transaksi, dan Ringkasan Laporan) ke dalam satu file berkas JSON terstruktur.
              </p>

              {currentStats && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    marginBottom: '14px',
                    backgroundColor: '#ffffff',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Menu</div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{currentStats.products}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Bahan</div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{currentStats.ingredients}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Transaksi</div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{currentStats.orders}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Shift</div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{currentStats.shifts}</strong>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleDownloadBackup}
                disabled={isExporting || isRestoring}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7',
                }}
              >
                {isExporting ? 'Menyiapkan File Backup...' : 'Unduh File Backup (.json)'}
              </button>
            </div>

            {/* SECTION 2: IMPORT / RESTORE */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#991b1b', fontWeight: 700 }}>
                2. Pulihkan Database (Restore)
              </h4>
              <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                Pilih file backup (.json) resmi Triwara POS untuk memulihkan seluruh data toko ke perangkat ini. Data lokal yang ada saat ini akan digantikan oleh isi file backup.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring || isExporting}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {selectedFile ? selectedFile.name : 'Pilih File Backup (.json)'}
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Batal Pilih"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Preview Box */}
              {parsedPreview && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #f87171',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, marginBottom: '6px' }}>
                    🔍 Pratinjau Isi File Backup:
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                    Waktu Backup: {new Date(parsedPreview.exportedAt).toLocaleString('id-ID')}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '6px',
                      fontSize: '11px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      padding: '8px',
                      borderRadius: '4px',
                    }}
                  >
                    <div>
                      Menu: <strong>{parsedPreview.stats?.products ?? parsedPreview.data?.products?.length ?? 0}</strong>
                    </div>
                    <div>
                      Bahan: <strong>{parsedPreview.stats?.ingredients ?? parsedPreview.data?.ingredients?.length ?? 0}</strong>
                    </div>
                    <div>
                      Transaksi: <strong>{parsedPreview.stats?.orders ?? parsedPreview.data?.orders?.length ?? 0}</strong>
                    </div>
                    <div>
                      Shift: <strong>{parsedPreview.stats?.shifts ?? parsedPreview.data?.shifts?.length ?? 0}</strong>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleConfirmRestore}
                disabled={!selectedFile || !parsedPreview || isRestoring || isExporting}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: !selectedFile || !parsedPreview ? '#cbd5e1' : '#dc2626',
                  cursor: !selectedFile || !parsedPreview ? 'not-allowed' : 'pointer',
                }}
              >
                {isRestoring ? '⏳ Memulihkan Database...' : 'Pulihkan Database Sekarang'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <DialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        isDanger={dialogConfig.isDanger}
        confirmText={dialogConfig.confirmText}
        onConfirm={dialogConfig.onConfirm}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

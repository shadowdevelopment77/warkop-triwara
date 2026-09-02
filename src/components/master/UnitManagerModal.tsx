// ═══════════════════════════════════════════════
// Triwara POS — Unit Manager Modal (Add & Delete with In-Use Protection)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IIngredient } from '../../types';
import { ingredientService } from '../../services/ingredient.service';
import { DialogModal } from '../common/DialogModal';

interface UnitManagerModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export const UnitManagerModal: React.FC<UnitManagerModalProps> = ({ onClose, onChanged }) => {
  const [units, setUnits] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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

  const loadData = useCallback(async () => {
    const list = await ingredientService.getUnits();
    const ings = await ingredientService.getAll();
    setUnits(list);
    setIngredients(ings);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = newUnitName.trim();
    if (!trimmed) {
      setErrorMsg('Nama satuan tidak boleh kosong');
      return;
    }

    try {
      setIsSubmitting(true);
      await ingredientService.addUnit(trimmed);
      setNewUnitName('');
      setSuccessMsg(`Satuan "${trimmed}" berhasil ditambahkan!`);
      await loadData();
      onChanged();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unitName: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    const matchingIngredients = ingredients.filter(
      (i) => i.unit.trim().toLowerCase() === unitName.trim().toLowerCase()
    );

    if (matchingIngredients.length > 0) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Tidak Dapat Menghapus Satuan',
        message: `Satuan "${unitName}" masih aktif digunakan oleh ${matchingIngredients.length} bahan baku:\n\n• ${matchingIngredients.map((i) => i.name).join('\n• ')}\n\nUbah satuan bahan-bahan di atas terlebih dahulu jika ingin menghapus satuan ini.`,
        isDanger: true,
        confirmText: 'Mengerti',
        onConfirm: () => {},
      });
      return;
    }

    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Hapus Satuan Ukur?',
      message: `Apakah Anda yakin ingin menghapus satuan "${unitName}" dari daftar pilihan?`,
      isDanger: true,
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          await ingredientService.deleteUnit(unitName);
          setSuccessMsg(`Satuan "${unitName}" berhasil dihapus.`);
          await loadData();
          onChanged();
        } catch (err) {
          setErrorMsg((err as Error).message);
        }
      },
    });
  };

  const isDefaultUnit = (u: string) => ['gr', 'ml', 'pcs'].includes(u.toLowerCase());

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="inv-modal-card"
          style={{ maxWidth: '460px', width: '90%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="inv-modal-header">
            <h3 className="inv-modal-title">Kelola Satuan Ukur (Unit)</h3>
            <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
              ✕
            </button>
          </div>

          <div className="inv-modal-body">
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}
            {successMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ade80',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {successMsg}
              </div>
            )}

            {/* List Satuan Eksisting */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Daftar Satuan Ukur Aktif
              </label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '4px',
                }}
              >
                {units.map((u) => {
                  const usedCount = ingredients.filter(
                    (i) => i.unit.trim().toLowerCase() === u.trim().toLowerCase()
                  ).length;
                  const isDefault = isDefaultUnit(u);

                  return (
                    <div
                      key={u}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-input, #1e293b)',
                        border: '1px solid var(--border-color, #334155)',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-color, #f8fafc)' }}>{u}</span>
                        {isDefault && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                            }}
                          >
                            Default
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: usedCount > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                            color: usedCount > 0 ? '#4ade80' : 'var(--text-muted, #94a3b8)',
                          }}
                        >
                          {usedCount > 0 ? `${usedCount} bahan` : 'Belum digunakan'}
                        </span>
                      </div>

                      <div>
                        {isDefault ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Terkunci</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteUnit(u)}
                            style={{
                              backgroundColor: usedCount > 0 ? '#334155' : 'rgba(239, 68, 68, 0.15)',
                              color: usedCount > 0 ? '#94a3b8' : '#f87171',
                              border: '1px solid',
                              borderColor: usedCount > 0 ? '#475569' : 'rgba(239, 68, 68, 0.3)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                            title={usedCount > 0 ? 'Satuan sedang digunakan oleh bahan baku' : 'Hapus satuan'}
                          >
                            {usedCount > 0 ? '🔒 Dipakai' : 'Hapus'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Tambah Satuan */}
            <form onSubmit={handleAddUnit} style={{ borderTop: '1px solid var(--border-color, #334155)', paddingTop: '16px' }}>
              <label className="form-label">Tambah Satuan Ukur Baru</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="contoh: botol, shot, sachet, pack..."
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="inv-btn-primary"
                  disabled={isSubmitting || !newUnitName.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isSubmitting ? 'Menyimpan...' : '+ Tambah Satuan'}
                </button>
              </div>
            </form>
          </div>

          <div className="inv-modal-footer" style={{ borderTop: '1px solid var(--border-color, #334155)', padding: '12px 20px' }}>
            <button type="button" className="inv-btn-secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>
              Selesai
            </button>
          </div>
        </div>
      </div>

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
    </>
  );
};

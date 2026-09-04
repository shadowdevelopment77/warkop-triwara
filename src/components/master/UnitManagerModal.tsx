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
                  border: '1px solid #22c55e',
                  color: '#4ade80',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                {successMsg}
              </div>
            )}

            {/* Form Tambah Satuan */}
            <form onSubmit={handleAddUnit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Satuan baru (cth: botol, shot, sachet)..."
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="inv-btn-primary"
                style={{ whiteSpace: 'nowrap' }}
                disabled={isSubmitting}
              >
                + Tambah
              </button>
            </form>

            {/* Daftar Satuan */}
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
                Daftar Satuan Ukur ({units.length})
              </span>

              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
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
                        padding: '10px 14px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
                          {u}
                        </span>
                        {isDefault && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#e2e8f0',
                              color: '#64748b',
                            }}
                          >
                            Default
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: usedCount > 0 ? '#dbeafe' : 'transparent',
                            color: usedCount > 0 ? '#1d4ed8' : '#64748b',
                          }}
                        >
                          {usedCount > 0 ? `(${usedCount} bahan)` : '(Belum dipakai)'}
                        </span>
                      </div>

                      <div>
                        {isDefault ? (
                          <span
                            style={{
                              fontSize: '16px',
                              cursor: 'not-allowed',
                              opacity: 0.35,
                              color: '#71717a',
                              padding: '4px 8px',
                              borderRadius: '4px',
                            }}
                            title="Satuan default sistem tidak dapat dihapus"
                          >
                            🗑️
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="menu-btn-icon-danger"
                            onClick={() => handleDeleteUnit(u)}
                            title={usedCount > 0 ? `Satuan sedang digunakan oleh ${usedCount} bahan` : `Hapus satuan "${u}"`}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              opacity: 1,
                              fontSize: '16px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              color: '#ef4444',
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="inv-modal-footer">
            <button type="button" className="inv-btn-secondary" onClick={onClose}>
              Tutup
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

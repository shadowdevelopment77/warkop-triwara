// ═══════════════════════════════════════════════
// Triwara POS — Inventory Category Manager Modal (Add & Delete with Protection)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IIngredient } from '../../types';
import { ingredientService } from '../../services/ingredient.service';

interface InventoryCategoryManagerModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export const InventoryCategoryManagerModal: React.FC<InventoryCategoryManagerModalProps> = ({
  onClose,
  onChanged,
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    const cats = await ingredientService.getCategories();
    const ings = await ingredientService.getAll();
    setCategories(cats);
    setIngredients(ings);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg('Nama kategori tidak boleh kosong');
      return;
    }

    try {
      setIsSubmitting(true);
      await ingredientService.addCategory(trimmed);
      setNewCatName('');
      setSuccessMsg(`Kategori "${trimmed}" berhasil ditambahkan!`);
      await loadData();
      onChanged();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await ingredientService.deleteCategory(catName);
      setSuccessMsg(`Kategori "${catName}" berhasil dihapus.`);
      await loadData();
      onChanged();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const formatCategoryLabel = (cat: string) => {
    if (cat === 'raw') return 'Bahan Baku (Default)';
    if (cat === 'packaging') return 'Kemasan (Default)';
    return cat;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '460px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inv-modal-header">
          <h3 className="inv-modal-title">Kelola Kategori Inventori</h3>
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

          {/* Form Tambah Kategori */}
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Kategori baru (cth: Sirup, Powder)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
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

          {/* Daftar Kategori */}
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>
              Daftar Kategori ({categories.length})
            </span>

            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {categories.map((cat) => {
                const count = ingredients.filter((i) => i.category === cat).length;
                const isSystem = cat === 'raw' || cat === 'packaging';

                return (
                  <div
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#fafafa', fontSize: '14px' }}>
                        {formatCategoryLabel(cat)}
                      </span>
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '12px',
                          color: count > 0 ? '#60a5fa' : '#71717a',
                        }}
                      >
                        ({count} bahan)
                      </span>
                    </div>

                    <div>
                      {isSystem ? (
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: '#27272a',
                            color: '#a1a1aa',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          Sistem
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="menu-btn-icon-danger"
                          onClick={() => handleDeleteCategory(cat)}
                          title={`Hapus kategori "${cat}"`}
                        >
                          ✕
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
  );
};

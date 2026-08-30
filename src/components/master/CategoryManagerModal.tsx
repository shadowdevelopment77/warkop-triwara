// ═══════════════════════════════════════════════
// Triwara POS — Category Manager Modal (Add & Delete)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { ICategory, IProduct } from '../../types';
import { productService } from '../../services/product.service';

interface CategoryManagerModalProps {
  onClose: () => void;
  onChanged: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ onClose, onChanged }) => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const loadData = useCallback(async () => {
    const cats = await productService.getCategories();
    const prods = await productService.getProducts();
    setCategories(cats);
    setProducts(prods);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newCatName.trim()) {
      setErrorMsg('Nama kategori tidak boleh kosong');
      return;
    }

    try {
      await productService.addCategory(newCatName.trim());
      setNewCatName('');
      setSuccessMsg('Kategori berhasil ditambahkan!');
      await loadData();
      onChanged();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleDeleteCategory = async (cat: ICategory) => {
    if (!cat.id) return;
    setErrorMsg('');
    setSuccessMsg('');

    const usageCount = products.filter((p) => p.categoryId === cat.id).length;
    if (usageCount > 0) {
      setErrorMsg(`Kategori "${cat.name}" tidak dapat dihapus karena sedang digunakan oleh ${usageCount} menu produk.`);
      return;
    }

    try {
      await productService.deleteCategory(cat.id);
      setSuccessMsg(`Kategori "${cat.name}" berhasil dihapus.`);
      await loadData();
      onChanged();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="menu-modal-card"
        style={{ maxWidth: '460px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-modal-header">
          <h3 className="menu-modal-title">Kelola Kategori Menu</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <div className="menu-modal-body" style={{ padding: '20px' }}>
          {errorMsg && <div className="form-error-alert" style={{ marginBottom: '12px' }}>{errorMsg}</div>}
          {successMsg && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Form Add Category */}
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nama kategori baru..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="menu-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              + Tambah
            </button>
          </form>

          {/* Category List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {categories.map((cat) => {
              const usageCount = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: '#fafafa', fontSize: '14px' }}>{cat.name}</strong>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: usageCount > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(113, 113, 122, 0.2)',
                        color: usageCount > 0 ? '#60a5fa' : '#a1a1aa',
                      }}
                    >
                      {usageCount} produk
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    disabled={usageCount > 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: usageCount > 0 ? 'not-allowed' : 'pointer',
                      opacity: usageCount > 0 ? 0.35 : 1,
                      fontSize: '16px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      color: usageCount > 0 ? '#71717a' : '#ef4444',
                    }}
                    title={
                      usageCount > 0
                        ? `Tidak bisa dihapus karena dipakai ${usageCount} produk`
                        : `Hapus kategori ${cat.name}`
                    }
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="menu-modal-footer">
          <button type="button" className="menu-btn-secondary" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

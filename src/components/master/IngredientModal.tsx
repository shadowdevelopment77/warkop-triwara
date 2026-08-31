// ═══════════════════════════════════════════════
// Triwara POS — Ingredient Add / Edit Modal (Clean Placeholders)
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IIngredient, IngredientCategory, UnitType } from '../../types';
import { ingredientService } from '../../services/ingredient.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import { DialogModal } from '../common/DialogModal';

interface IngredientModalProps {
  ingredient: IIngredient | null;
  onClose: () => void;
  onSaved: () => void;
}

export const IngredientModal: React.FC<IngredientModalProps> = ({ ingredient, onClose, onSaved }) => {
  const isEditing = Boolean(ingredient);

  const [name, setName] = useState<string>(ingredient?.name || '');
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category || 'raw');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['raw', 'packaging']);
  const [availableUnits, setAvailableUnits] = useState<string[]>(['gr', 'ml', 'pcs']);
  const [unit, setUnit] = useState<UnitType>(ingredient?.unit || 'gr');
  const [currentStock, setCurrentStock] = useState<number | ''>(ingredient ? ingredient.currentStock : '');
  const [minStock, setMinStock] = useState<number | ''>(ingredient ? ingredient.minStock : '');
  const [purchasePackageName, setPurchasePackageName] = useState<string>(ingredient?.purchasePackageName || '');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(ingredient ? ingredient.purchasePrice : '');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number | ''>(ingredient ? ingredient.purchaseQuantity : '');
  const [errorMsg, setErrorMsg] = useState<string>('');
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

  useEffect(() => {
    ingredientService.getCategories().then((cats) => {
      setAvailableCategories(cats);
    });
    ingredientService.getUnits().then((u) => {
      setAvailableUnits(u);
      if (!ingredient && u.length > 0 && !u.includes(unit)) {
        setUnit(u[0]);
      }
    });
  }, [ingredient, unit]);

  const numPrice = typeof purchasePrice === 'number' ? purchasePrice : 0;
  const numQty = typeof purchaseQuantity === 'number' ? purchaseQuantity : 0;
  const calculatedCostPerUnit = numQty > 0 ? Math.round((numPrice / numQty) * 100) / 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isEditing && ingredient?.id) {
      if (minStock === '' || Number(minStock) < 0) {
        setErrorMsg('Batas minimal alert harus diisi (minimal 0)');
        return;
      }
      try {
        await ingredientService.updateIngredient(ingredient.id, {
          minStock: Number(minStock),
        });
        await notificationService.addNotification(
          'Batas Alert Diperbarui',
          `Batas minimal alert untuk "${ingredient.name}" berhasil diubah menjadi ${minStock} ${unit}.`,
          'inventory',
          'inventory'
        );
        onSaved();
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Nama bahan baku tidak boleh kosong');
      return;
    }
    if (currentStock === '' || Number(currentStock) < 0) {
      setErrorMsg('Stok saat ini harus diisi (minimal 0)');
      return;
    }
    if (minStock === '' || Number(minStock) < 0) {
      setErrorMsg('Batas minimal alert harus diisi');
      return;
    }
    if (purchasePrice === '' || Number(purchasePrice) < 0) {
      setErrorMsg('Harga pembelian harus diisi');
      return;
    }
    if (purchaseQuantity === '' || Number(purchaseQuantity) <= 0) {
      setErrorMsg('Jumlah isi per beli harus lebih dari 0');
      return;
    }

    try {
      await ingredientService.addIngredient({
        name: name.trim(),
        category,
        unit: unit.trim() || 'gr',
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        purchasePackageName: purchasePackageName.trim() || 'Paket Standar',
        purchasePrice: Number(purchasePrice),
        purchaseQuantity: Number(purchaseQuantity),
      });
      await notificationService.addNotification(
        'Bahan Baru Ditambahkan',
        `Bahan "${name.trim()}" berhasil ditambahkan ke inventaris.`,
        'inventory',
        'inventory'
      );
      onSaved();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!ingredient?.id) return;
    try {
      const usedMenuNames = await ingredientService.getProductsUsingIngredient(ingredient.id);
      if (usedMenuNames.length > 0) {
        setDialogConfig({
          isOpen: true,
          type: 'alert',
          title: 'Tidak Dapat Menghapus Bahan',
          message: `Bahan "${ingredient.name}" masih aktif digunakan dalam resep ${usedMenuNames.length} menu berikut:\n\n• ${usedMenuNames.join('\n• ')}\n\nSilakan hapus bahan ini dari resep menu di atas sebelum menghapusnya dari inventori.`,
          isDanger: true,
          confirmText: 'Mengerti',
          onConfirm: () => {},
        });
        return;
      }

      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: 'Hapus Bahan Inventaris?',
        message: `Apakah Anda yakin ingin menghapus bahan "${ingredient.name}" dari stok? Tindakan ini permanen.`,
        isDanger: true,
        confirmText: 'Ya, Hapus',
        onConfirm: async () => {
          try {
            await ingredientService.deleteIngredient(ingredient.id!);
            await notificationService.addNotification(
              'Bahan Dihapus',
              `Bahan "${ingredient.name}" telah dihapus dari inventaris.`,
              'inventory',
              'inventory'
            );
            onSaved();
          } catch (err) {
            setErrorMsg((err as Error).message);
          }
        },
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="inv-modal-card ingredient-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="inv-modal-header">
            <div>
              <h3 className="inv-modal-title">{isEditing ? `Detail Bahan: ${ingredient?.name}` : 'Tambah Bahan Baku Baru'}</h3>
              {isEditing && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  🔒 Kolom dikunci untuk menjaga integritas HPP & stok. Hanya batas alert yang dapat disunting.
                </p>
              )}
            </div>
            <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="inv-modal-body">
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

            <div className="form-group">
              <label className="form-label">Nama Bahan Baku / Kemasan</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: Biji Kopi Arabica, Fresh Milk UHT, Paper Cup 8oz..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEditing}
                required
              />
            </div>

            <div className="form-row two-cols">
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                  disabled={isEditing}
                >
                  <option value="raw">Bahan Baku (raw)</option>
                  <option value="packaging">Kemasan Sekali Pakai (packaging)</option>
                  {availableCategories
                    .filter((c) => c !== 'raw' && c !== 'packaging')
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Satuan Ukur (Unit)</label>
                <select
                  className="form-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  disabled={isEditing}
                  required
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row two-cols">
              <div className="form-group">
                <label className="form-label">Stock Saat Ini ({unit})</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="contoh: 1000"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  disabled={isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: isEditing ? 'var(--primary-color)' : undefined, fontWeight: 700 }}>
                  Batas Minimal Alert ({unit}) {isEditing && '✏️'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  style={isEditing ? { borderColor: 'var(--primary-color)', backgroundColor: 'var(--bg-input)' } : undefined}
                  placeholder="contoh: 100"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Cost Calculator Section */}
            <div className="calc-section-box">
              <h4 className="calc-section-title">Kalkulator Biaya Modal Beli (Cost Per Unit)</h4>

              <div className="form-group">
                <label className="form-label">Nama Kemasan Pembelian Supplier</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="contoh: Bag 1kg, Karton 1 Liter, Sleeve 50 pcs..."
                  value={purchasePackageName}
                  onChange={(e) => setPurchasePackageName(e.target.value)}
                  disabled={isEditing}
                />
              </div>

              <div className="form-row two-cols">
                <div className="form-group">
                  <label className="form-label">Harga Pembelian (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="contoh: 150000"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    disabled={isEditing}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Jumlah Isi per Beli ({unit})</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="contoh: 1000"
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    disabled={isEditing}
                    required
                  />
                </div>
              </div>

              <div className="calc-result-badge">
                <span>Hasil Cost per {unit}: </span>
                <strong>
                  {formatRupiah(calculatedCostPerUnit)} / {unit}
                </strong>
              </div>
            </div>

            <div className="inv-modal-footer" style={{ margin: '20px -20px -20px -20px' }}>
              {isEditing && (
                <button type="button" className="inv-btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
                  Hapus Bahan
                </button>
              )}
              <button type="button" className="inv-btn-secondary" onClick={onClose}>
                {isEditing ? 'Tutup' : 'Batal'}
              </button>
              <button type="submit" className="inv-btn-primary">
                {isEditing ? 'Simpan Batas Alert' : '+ Tambah Bahan'}
              </button>
            </div>
          </form>
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

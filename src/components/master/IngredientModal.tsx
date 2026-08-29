// ═══════════════════════════════════════════════
// Triwara POS — Add / Edit Ingredient Modal
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IIngredient, IngredientCategory, UnitType } from '../../types';
import { ingredientService } from '../../services/ingredient.service';
import { formatRupiah } from '../../utils/currency';

interface IngredientModalProps {
  ingredient: IIngredient | null;
  onClose: () => void;
  onSaved: () => void;
}

export const IngredientModal: React.FC<IngredientModalProps> = ({ ingredient, onClose, onSaved }) => {
  const isEditing = Boolean(ingredient);

  const [name, setName] = useState<string>(ingredient?.name || '');
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category || 'raw');
  const [unit, setUnit] = useState<UnitType>(ingredient?.unit || 'gr');
  const [currentStock, setCurrentStock] = useState<number>(ingredient?.currentStock || 1000);
  const [minStock, setMinStock] = useState<number>(ingredient?.minStock || 100);
  const [purchasePackageName, setPurchasePackageName] = useState<string>(
    ingredient?.purchasePackageName || 'Pouch / Carton 1 Unit'
  );
  const [purchasePrice, setPurchasePrice] = useState<number>(ingredient?.purchasePrice || 100000);
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(ingredient?.purchaseQuantity || 1000);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const calculatedCostPerUnit = purchaseQuantity > 0 ? Math.round((purchasePrice / purchaseQuantity) * 100) / 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama bahan baku tidak boleh kosong');
      return;
    }

    try {
      if (isEditing && ingredient?.id) {
        await ingredientService.updateIngredient(ingredient.id, {
          name: name.trim(),
          category,
          unit,
          currentStock,
          minStock,
          purchasePackageName: purchasePackageName.trim(),
          purchasePrice,
          purchaseQuantity,
        });
      } else {
        await ingredientService.addIngredient({
          name: name.trim(),
          category,
          unit,
          currentStock,
          minStock,
          purchasePackageName: purchasePackageName.trim(),
          purchasePrice,
          purchaseQuantity,
        });
      }
      onSaved();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!ingredient?.id) return;
    if (confirm(`Hapus bahan "${ingredient.name}" dari stok?`)) {
      try {
        await ingredientService.deleteIngredient(ingredient.id);
        onSaved();
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card ingredient-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{isEditing ? `Edit Bahan: ${ingredient?.name}` : 'Tambah Bahan Baku Baru'}</h3>
            <span className="modal-subtitle">Atur detail bahan baku, satuan, &amp; kalkulasi biaya modal</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [✕]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">Nama Bahan Baku / Kemasan</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cth: Biji Kopi House Blend, Fresh Milk UHT, Cup 16oz..."
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              >
                <option value="raw">Bahan Baku (Minuman/Makanan)</option>
                <option value="packaging">Kemasan Sekali Pakai (Takeaway)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Satuan Ukur (Unit)</label>
              <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value as UnitType)}>
                <option value="gr">Gram (gr)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="pcs">Pieces (pcs / lembar)</option>
              </select>
            </div>
          </div>

          <div className="form-row two-cols">
            <div className="form-group">
              <label className="form-label">Stok Fisik ({unit})</label>
              <input
                type="number"
                className="form-input"
                value={currentStock}
                onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Batas Minimal Alert ({unit})</label>
              <input
                type="number"
                className="form-input"
                value={minStock}
                onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
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
                placeholder="Cth: Bag 1 kg, Karton 1 Liter, Sleeve 50 pcs..."
                value={purchasePackageName}
                onChange={(e) => setPurchasePackageName(e.target.value)}
              />
            </div>

            <div className="form-row two-cols">
              <div className="form-group">
                <label className="form-label">Harga Pembelian (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jumlah Isi per Beli ({unit})</label>
                <input
                  type="number"
                  className="form-input"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(parseFloat(e.target.value) || 1)}
                  required
                />
              </div>
            </div>

            <div className="calc-result-badge">
              <span>Hasil Cost per {unit}:</span>
              <strong>
                {formatRupiah(calculatedCostPerUnit)} / {unit}
              </strong>
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Hapus
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan Bahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

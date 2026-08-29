// ═══════════════════════════════════════════════
// Triwara POS — Quick Restock Modal (Weighted Average Costing)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IIngredient } from '../../types';
import { ingredientService } from '../../services/ingredient.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';

interface RestockModalProps {
  ingredient: IIngredient;
  onClose: () => void;
  onRestocked: () => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({ ingredient, onClose, onRestocked }) => {
  const [addedQty, setAddedQty] = useState<number>(ingredient.purchaseQuantity || 1000);
  const [purchasePrice, setPurchasePrice] = useState<number>(ingredient.purchasePrice || 100000);
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(ingredient.purchaseQuantity || 1000);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const batchCostPerUnit = purchaseQuantity > 0 ? purchasePrice / purchaseQuantity : 0;
  const currentTotalVal = ingredient.currentStock * ingredient.costPerUnit;
  const addedTotalVal = addedQty * batchCostPerUnit;
  const newTotalStock = ingredient.currentStock + addedQty;
  const projectedWeightedCost =
    newTotalStock > 0 ? (currentTotalVal + addedTotalVal) / newTotalStock : batchCostPerUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (addedQty <= 0) {
      setErrorMsg('Jumlah stok restock harus lebih dari 0');
      return;
    }

    try {
      await ingredientService.restockIngredient(ingredient.id!, addedQty, purchasePrice, purchaseQuantity);
      await notificationService.addNotification(
        'Restock Bahan Sukses',
        `Restock "${ingredient.name}" sebanyak +${addedQty} ${ingredient.unit} berhasil dicatat.`,
        'inventory',
        'inventory'
      );
      onRestocked();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card restock-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Tambah Stock: {ingredient.name}</h3>
            <span className="modal-subtitle">Catat kedatangan stok baru dari supplier</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

          <div className="info-summary-card">
            <span>Stok Saat Ini:</span>
            <strong>
              {ingredient.currentStock} {ingredient.unit}
            </strong>
            <small>Cost Saat Ini: {formatRupiah(ingredient.costPerUnit)} / {ingredient.unit}</small>
          </div>

          <div className="form-group">
            <label className="form-label">Kuantitas Masuk (+ {ingredient.unit})</label>
            <input
              type="number"
              className="form-input price-input-lg"
              value={addedQty || ''}
              onChange={(e) => setAddedQty(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="calc-section-box">
            <h4 className="calc-section-title">Detail Pembelian Batch Ini (Opsional / Weighted Average)</h4>

            <div className="form-row two-cols">
              <div className="form-group">
                <label className="form-label">Total Harga Beli Batch (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Isi per Beli ({ingredient.unit})</label>
                <input
                  type="number"
                  className="form-input"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="calc-result-badge">
              <span>Estimasi Cost Baru (Weighted Avg):</span>
              <strong>{formatRupiah(projectedWeightedCost)} / {ingredient.unit}</strong>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan Restock (+{addedQty} {ingredient.unit})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

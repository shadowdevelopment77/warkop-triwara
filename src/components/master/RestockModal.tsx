// ═══════════════════════════════════════════════
// Triwara POS — Quick Restock Modal (Weighted Average Costing)
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IIngredient } from '../../types';
import { ingredientService } from '../../services/ingredient.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import { NumberInput } from '../common/NumberInput';

interface RestockModalProps {
  ingredient: IIngredient;
  onClose: () => void;
  onRestocked: () => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({ ingredient, onClose, onRestocked }) => {
  const [addedQty, setAddedQty] = useState<number>(ingredient.purchaseQuantity || 1000);
  const [purchasePrice, setPurchasePrice] = useState<number>(ingredient.purchasePrice || 100000);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const batchCostPerUnit = addedQty > 0 ? purchasePrice / addedQty : 0;
  const currentTotalVal = ingredient.currentStock * ingredient.costPerUnit;
  const newTotalStock = ingredient.currentStock + addedQty;
  const projectedWeightedCost =
    newTotalStock > 0 ? (currentTotalVal + purchasePrice) / newTotalStock : batchCostPerUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (addedQty <= 0) {
      setErrorMsg('Jumlah stok barang masuk harus lebih dari 0');
      return;
    }
    if (purchasePrice < 0) {
      setErrorMsg('Total harga beli tidak boleh negatif');
      return;
    }

    try {
      // Pass addedQty as both added quantity and purchase quantity
      await ingredientService.restockIngredient(ingredient.id!, addedQty, purchasePrice, addedQty);
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
      <div className="inv-modal-card restock-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h3 className="inv-modal-title">Restock Bahan: {ingredient.name}</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="inv-modal-body">
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

            <div className="info-summary-card">
              <div>
                <span>Stok Saat Ini: </span>
                <strong>{ingredient.currentStock} {ingredient.unit}</strong>
              </div>
              <div>
                <span>HPP Lama: </span>
                <strong>{formatRupiah(ingredient.costPerUnit)} / {ingredient.unit}</strong>
              </div>
            </div>

            <div className="inv-form-group">
              <label className="inv-form-label">Jumlah Barang Masuk (+ {ingredient.unit})</label>
              <NumberInput
                style={{ fontSize: '16px', fontWeight: 600 }}
                placeholder={`contoh: 1.000 ${ingredient.unit}`}
                value={addedQty || ''}
                onChange={(v) => setAddedQty(v === '' ? 0 : v)}
                allowDecimal
                required
              />
            </div>

            <div className="inv-form-group">
              <label className="inv-form-label">Total Uang Belanja yang Dibayar (Rp)</label>
              <NumberInput
                style={{ fontSize: '16px', fontWeight: 600 }}
                placeholder="contoh: 150.000"
                value={purchasePrice || ''}
                onChange={(v) => setPurchasePrice(v === '' ? 0 : v)}
                required
              />
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                Masukkan total nominal uang yang dikeluarkan dari kas kecil untuk belanja ini.
              </span>
            </div>

            <div className="calc-section-box">
              <div className="inv-calc-badge" style={{ marginBottom: '8px' }}>
                <span>Harga Beli Batch Ini:</span>
                <strong>{formatRupiah(batchCostPerUnit)} / {ingredient.unit}</strong>
              </div>

              <div className="inv-calc-badge" style={{ marginBottom: '8px' }}>
                <span>Total Stok Menjadi:</span>
                <strong style={{ color: '#22c55e' }}>{newTotalStock} {ingredient.unit}</strong>
              </div>

              <div className="inv-calc-badge" style={{ border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <span>Estimasi HPP Baru (Weighted Avg):</span>
                <strong style={{ color: '#60a5fa', fontSize: '15px' }}>
                  {formatRupiah(projectedWeightedCost)} / {ingredient.unit}
                </strong>
              </div>
            </div>
          </div>

          <div className="inv-modal-footer">
            <button type="button" className="inv-btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="inv-btn-primary">
              Simpan Restock (+{addedQty} {ingredient.unit})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

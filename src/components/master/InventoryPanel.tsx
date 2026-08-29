// ═══════════════════════════════════════════════
// Triwara POS — Inventory Stock Table Panel
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IIngredient } from '../../types';
import { ingredientService } from '../../services/ingredient.service';
import { pdfService } from '../../services/pdf.service';
import { configService } from '../../services/config.service';
import { formatRupiah } from '../../utils/currency';
import { IngredientModal } from './IngredientModal';
import { RestockModal } from './RestockModal';

export const InventoryPanel: React.FC = () => {
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc'>('name_asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingIngredient, setEditingIngredient] = useState<IIngredient | null>(null);
  const [restockingIngredient, setRestockingIngredient] = useState<IIngredient | null>(null);

  const loadIngredients = useCallback(async () => {
    try {
      const data = await ingredientService.getAll(sortBy);
      setIngredients(data);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    }
  }, [sortBy]);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const handleToggleNameSort = () => {
    setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc');
  };

  const handleToggleStockSort = () => {
    setSortBy(sortBy === 'stock_asc' ? 'stock_desc' : 'stock_asc');
  };

  const handleExportPdf = async () => {
    try {
      const config = await configService.getConfig();
      await pdfService.exportInventoryReport(ingredients, config);
    } catch (err) {
      alert('Gagal mengeksport PDF: ' + (err as Error).message);
    }
  };

  const getStatusBadge = (ing: IIngredient) => {
    if (ing.currentStock <= ing.minStock * 0.1) {
      return <span className="status-badge critical">Kritis</span>;
    }
    if (ing.currentStock <= ing.minStock) {
      return <span className="status-badge low">Low</span>;
    }
    return <span className="status-badge safe">Aman</span>;
  };

  return (
    <div className="master-view-container">
      {/* Header Title & Actions */}
      <div className="master-view-header">
        <div>
          <h2 className="view-title">Inventaris Stok Bahan Baku &amp; Kemasan</h2>
          <p className="view-subtitle">Kelola stok biji kopi, susu, syrup, dan kemasan sekali pakai.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleExportPdf}>
            Export PDF
          </button>
          <button type="button" className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Tambah Bahan Baru
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="table-card-wrapper">
        <table className="pos-data-table">
          <thead>
            <tr>
              <th onClick={handleToggleNameSort} className="sortable-th">
                Bahan / Kemasan {sortBy.startsWith('name') ? (sortBy === 'name_asc' ? '▲' : '▼') : '↕'}
              </th>
              <th>Kategori</th>
              <th onClick={handleToggleStockSort} className="sortable-th">
                Stok Saat Ini {sortBy.startsWith('stock') ? (sortBy === 'stock_asc' ? '▲' : '▼') : '↕'}
              </th>
              <th>Minimal Alert</th>
              <th>Cost / Unit</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-td">
                  Belum ada data stok bahan. Klik "+ Tambah Bahan Baru".
                </td>
              </tr>
            ) : (
              ingredients.map((ing) => (
                <tr key={ing.id}>
                  <td>
                    <strong>{ing.name}</strong>
                  </td>
                  <td>
                    <span className="type-badge">{ing.category === 'raw' ? 'Bahan Utama' : 'Kemasan'}</span>
                  </td>
                  <td>
                    <strong>
                      {ing.currentStock} {ing.unit}
                    </strong>
                  </td>
                  <td>
                    {ing.minStock} {ing.unit}
                  </td>
                  <td>
                    {formatRupiah(ing.costPerUnit)} / {ing.unit}
                  </td>
                  <td>{getStatusBadge(ing)}</td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        type="button"
                        className="btn-action-small"
                        onClick={() => setRestockingIngredient(ing)}
                      >
                        [Tambah Stock]
                      </button>
                      <button
                        type="button"
                        className="btn-action-small secondary"
                        onClick={() => setEditingIngredient(ing)}
                      >
                        [Edit Bahan]
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <IngredientModal
          ingredient={null}
          onClose={() => setIsAddModalOpen(false)}
          onSaved={() => {
            setIsAddModalOpen(false);
            loadIngredients();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingIngredient && (
        <IngredientModal
          ingredient={editingIngredient}
          onClose={() => setEditingIngredient(null)}
          onSaved={() => {
            setEditingIngredient(null);
            loadIngredients();
          }}
        />
      )}

      {/* Quick Restock Modal */}
      {restockingIngredient && (
        <RestockModal
          ingredient={restockingIngredient}
          onClose={() => setRestockingIngredient(null)}
          onRestocked={() => {
            setRestockingIngredient(null);
            loadIngredients();
          }}
        />
      )}
    </div>
  );
};

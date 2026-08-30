// ═══════════════════════════════════════════════
// Triwara POS — Katalog Menu & Recipe Manager Panel
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IProduct, ICategory, IIngredient } from '../../types';
import { productService } from '../../services/product.service';
import { ingredientService } from '../../services/ingredient.service';
import { hppService, type IHppBreakdown } from '../../services/hpp.service';
import { formatRupiah } from '../../utils/currency';
import { RecipeEditor } from './RecipeEditor';
import { CategoryManagerModal } from './CategoryManagerModal';

export const MenuPanel: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Breakdown state for selected product
  const [dineHpp, setDineHpp] = useState<IHppBreakdown | null>(null);
  const [takeHpp, setTakeHpp] = useState<IHppBreakdown | null>(null);

  // Modal editor
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const cats = await productService.getCategories();
      const prods = await productService.getProducts(undefined, searchTerm);
      const ings = await ingredientService.getAll();

      setCategories(cats);
      setProducts(prods);
      setIngredients(ings);

      if (prods.length > 0) {
        if (!selectedProduct || !prods.some((p) => p.id === selectedProduct.id)) {
          setSelectedProduct(prods[0]);
        }
      } else {
        setSelectedProduct(null);
      }
    } catch (err) {
      console.error('Failed to load menu data:', err);
    }
  }, [searchTerm, selectedProduct]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update selected product breakdown
  useEffect(() => {
    if (selectedProduct) {
      hppService.calculateProductHpp(selectedProduct, 'dine_in').then(setDineHpp);
      hppService.calculateProductHpp(selectedProduct, 'takeaway').then(setTakeHpp);
    } else {
      setDineHpp(null);
      setTakeHpp(null);
    }
  }, [selectedProduct]);

  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);

  return (
    <div className="menu-panel-layout">
      {/* Left Sidebar: Search, Add Button & Vertical Menu List */}
      <aside className="menu-panel-sidebar">
        <div className="menu-sidebar-header">
          <input
            type="text"
            className="menu-search-input"
            placeholder="Cari menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="menu-btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                setSelectedProduct(null);
                setIsEditorOpen(true);
              }}
            >
              + Menu Baru
            </button>
            <button
              type="button"
              className="menu-btn-secondary"
              onClick={() => setIsCategoryManagerOpen(true)}
              title="Kelola Kategori Menu (Tambah / Hapus)"
            >
              Kelola Kategori
            </button>
          </div>
        </div>

        <div className="menu-items-scroll">
          {products.length === 0 ? (
            <p className="empty-hint-text">Tidak ada produk.</p>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`menu-row-btn ${selectedProduct?.id === p.id ? 'active' : ''}`}
                onClick={() => setSelectedProduct(p)}
              >
                <span className="menu-name">{p.name}</span>
                <span className="menu-price">{formatRupiah(p.price)}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right Content: Selected Product Detail & Recipe Breakdown */}
      <main className="menu-panel-content">

        {selectedProduct && dineHpp && takeHpp ? (

          <div className="menu-detail-card">
            {/* Top-Right Action Row */}
            <div className="menu-detail-top-actions">
              <button
                type="button"
                className="menu-btn-primary"
                onClick={() => setIsEditorOpen(true)}
              >
                ✏️ Edit Resep &amp; Menu
              </button>
            </div>

            {/* Centered Hero Header */}
            <div className="menu-detail-hero-center">
              <h3 className="menu-detail-title">{selectedProduct.name}</h3>
              <span className="menu-detail-price">Harga Jual: {formatRupiah(selectedProduct.price)}</span>
            </div>

            {/* HPP Cards */}
            <div className="menu-hpp-grid">
              <div className="menu-hpp-box dine-in">
                <span className="menu-box-title">Dine-In</span>
                <strong style={{ fontSize: '18px', color: '#fafafa' }}>
                  HPP: {formatRupiah(dineHpp.totalHpp)}
                </strong>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>
                  Laba Bersih: +{formatRupiah(dineHpp.grossProfit)} ({dineHpp.marginPercent}%)
                </span>
              </div>

              <div className="menu-hpp-box takeaway">
                <span className="menu-box-title">Takeaway</span>
                <strong style={{ fontSize: '18px', color: '#fafafa' }}>
                  HPP: {formatRupiah(takeHpp.totalHpp)}
                </strong>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
                  Laba Bersih: +{formatRupiah(takeHpp.grossProfit)} ({takeHpp.marginPercent}%)
                </span>
              </div>
            </div>

            {/* Ingredients Recipe Breakdown */}
            <div className="recipe-breakdown-section" style={{ marginTop: '16px' }}>
              <h4 style={{ color: '#fafafa', fontSize: '14px', marginBottom: '8px' }}>
                Rincian Biaya Bahan Baku Utama:
              </h4>
              {selectedProduct.recipe.length === 0 ? (
                <p className="empty-hint">Belum ada bahan baku utama.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedProduct.recipe.map((rec, idx) => {
                    const ing = ingredients.find((i) => i.id === rec.ingredientId);
                    const unitCost = ing ? ing.costPerUnit : 0;
                    const totalCost = rec.amount * unitCost;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#18181b',
                          borderRadius: '6px',
                          border: '1px solid #27272a',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#fafafa' }}>{ing ? ing.name : 'Bahan'}</strong>
                          <span style={{ color: '#a1a1aa', marginLeft: '8px', fontSize: '12px' }}>
                            ({rec.amount} {rec.unit} × {formatRupiah(unitCost)}/{rec.unit})
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#34d399' }}>
                          {formatRupiah(totalCost)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <h4 style={{ color: '#fafafa', fontSize: '14px', marginTop: '14px', marginBottom: '8px' }}>
                Rincian Biaya Kemasan:
              </h4>
              {selectedProduct.takeawayPackaging.length === 0 ? (
                <p className="empty-hint">Menu ini tidak menggunakan kemasan takeaway sekali pakai.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedProduct.takeawayPackaging.map((pkg, idx) => {
                    const ing = ingredients.find((i) => i.id === pkg.ingredientId);
                    const unitCost = ing ? ing.costPerUnit : 0;
                    const totalCost = pkg.amount * unitCost;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#18181b',
                          borderRadius: '6px',
                          border: '1px solid #27272a',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#fafafa' }}>{ing ? ing.name : 'Kemasan'}</strong>
                          <span style={{ color: '#a1a1aa', marginLeft: '8px', fontSize: '12px' }}>
                            ({pkg.amount} {pkg.unit} × {formatRupiah(unitCost)}/{pkg.unit})
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                          {formatRupiah(totalCost)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <h4 style={{ color: '#fafafa', fontSize: '14px', marginTop: '14px', marginBottom: '8px' }}>
                Additional:
              </h4>
              {!selectedProduct.availableAdditionals || selectedProduct.availableAdditionals.length === 0 ? (
                <p className="empty-hint">Menu ini belum memiliki additional khusus.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedProduct.availableAdditionals.map((add, idx) => {
                    const ing = ingredients.find((i) => i.id === add.ingredientId);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#18181b',
                          borderRadius: '6px',
                          border: '1px solid #27272a',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#fafafa' }}>{add.name}</strong>
                          {ing && add.amount && (
                            <span style={{ color: '#a1a1aa', marginLeft: '8px', fontSize: '12px' }}>
                              ({add.amount} {ing.unit} {ing.name})
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                          +{formatRupiah(add.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-selection-view">
            <p>Pilih menu di sebelah kiri untuk melihat resep &amp; HPP</p>
          </div>
        )}
      </main>

      {/* Recipe Editor Modal */}
      {isEditorOpen && (
        <RecipeEditor
          product={selectedProduct}
          categories={categories}
          onClose={() => setIsEditorOpen(false)}
          onSaved={() => {
            setIsEditorOpen(false);
            loadData();
          }}
        />
      )}

      {/* Category Manager Modal Dialog */}
      {isCategoryManagerOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryManagerOpen(false)}
          onChanged={loadData}
        />
      )}
    </div>
  );
};

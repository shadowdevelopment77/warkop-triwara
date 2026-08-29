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
import { CategoryModal } from './CategoryModal';

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

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  const handleSaveCategory = async (catName: string) => {
    await productService.addCategory(catName);
    await loadData();
  };

  return (
    <div className="menu-panel-layout">
      {/* Left Sidebar: Search, Add Button & Vertical Menu List */}
      <aside className="menu-panel-sidebar">
        <div className="sidebar-header">
          <input
            type="text"
            className="search-input"
            placeholder="Cari menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-primary"
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
              className="btn-secondary"
              onClick={() => setIsCategoryModalOpen(true)}
              title="Tambah Kategori Baru"
            >
              + Kategori
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
                <span className="code-badge">[{p.codeBadge}]</span>
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

          <div className="product-detail-card">

            <div className="detail-card-header">
              <div><button
                type="button"
                className="btn-primary"
                onClick={() => setIsEditorOpen(true)}
              >
                Edit Resep &amp; Menu
              </button></div>

              <div>

                <h3 className="detail-title">{selectedProduct.name}</h3>
                <span className="detail-price">Price: {formatRupiah(selectedProduct.price)}</span>
              </div>
            </div>

            {/* HPP Cards */}
            <div className="hpp-summary-grid">
              <div className="hpp-info-box dine-in">
                <span className="box-title">🍽️ Dine-In (Tanpa Kemasan)</span>
                <strong style={{ fontSize: '18px', color: '#fafafa' }}>
                  HPP: {formatRupiah(dineHpp.totalHpp)}
                </strong>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>
                  Laba Bersih: +{formatRupiah(dineHpp.grossProfit)} ({dineHpp.marginPercent}%)
                </span>
              </div>

              <div className="hpp-info-box takeaway">
                <span className="box-title">📦 Takeaway (+Kemasan Cup/Lid)</span>
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
                1. Rincian Biaya Bahan Baku Utama (Dine-In &amp; Takeaway):
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
                2. Rincian Biaya Kemasan Sekali Pakai (Khusus Takeaway):
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
                3. Pilihan Additional / Kustomisasi Khusus Menu Ini:
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
                              (Potong {add.amount} {ing.unit} {ing.name})
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

      {/* Category Modal Dialog */}
      {isCategoryModalOpen && (
        <CategoryModal
          title="Tambah Kategori Menu Baru"
          subtitle="Kategori akan langsung tersedia di katalog produk & kasir"
          placeholder="contoh: Makanan Ringan, Signature Mocktail..."
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={handleSaveCategory}
        />
      )}
    </div>
  );
};

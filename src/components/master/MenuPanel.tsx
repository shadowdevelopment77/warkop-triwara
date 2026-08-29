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
          <button
            type="button"
            className="btn-primary btn-full"
            onClick={() => {
              setSelectedProduct(null);
              setIsEditorOpen(true);
            }}
          >
            + Tambah Menu Baru
          </button>
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
              <div>
                <span className="detail-code-badge">[{selectedProduct.codeBadge}]</span>
                <h3 className="detail-title">{selectedProduct.name}</h3>
                <span className="detail-price">Harga Jual: {formatRupiah(selectedProduct.price)}</span>
                <p className="detail-desc">{selectedProduct.description}</p>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsEditorOpen(true)}
              >
                Edit Resep &amp; Menu
              </button>
            </div>

            {/* HPP Cards */}
            <div className="hpp-summary-grid">
              <div className="hpp-info-box dine-in">
                <span className="box-title">Dine-In (Tanpa Kemasan)</span>
                <strong>HPP: {formatRupiah(dineHpp.totalHpp)}</strong>
                <small>
                  Laba bersih: +{formatRupiah(dineHpp.grossProfit)} ({dineHpp.marginPercent}%)
                </small>
              </div>

              <div className="hpp-info-box takeaway">
                <span className="box-title">Takeaway (+Kemasan Cup/Lid)</span>
                <strong>HPP: {formatRupiah(takeHpp.totalHpp)}</strong>
                <small>
                  Laba bersih: +{formatRupiah(takeHpp.grossProfit)} ({takeHpp.marginPercent}%)
                </small>
              </div>
            </div>

            {/* Ingredients Recipe Breakdown */}
            <div className="recipe-breakdown-section">
              <h4>Resep Bahan Baku Utama:</h4>
              {selectedProduct.recipe.length === 0 ? (
                <p className="empty-hint">Belum ada bahan baku utama.</p>
              ) : (
                <ul className="recipe-list">
                  {selectedProduct.recipe.map((rec, idx) => {
                    const ing = ingredients.find((i) => i.id === rec.ingredientId);
                    const cost = rec.amount * (ing ? ing.costPerUnit : 0);
                    return (
                      <li key={idx}>
                        • {ing ? ing.name : 'Unknown'}: {rec.amount} {rec.unit} ({formatRupiah(cost)})
                      </li>
                    );
                  })}
                </ul>
              )}

              <h4>Kemasan Takeaway Sekali Pakai:</h4>
              {selectedProduct.takeawayPackaging.length === 0 ? (
                <p className="empty-hint">Belum ada kemasan takeaway.</p>
              ) : (
                <ul className="recipe-list">
                  {selectedProduct.takeawayPackaging.map((pkg, idx) => {
                    const ing = ingredients.find((i) => i.id === pkg.ingredientId);
                    const cost = pkg.amount * (ing ? ing.costPerUnit : 0);
                    return (
                      <li key={idx}>
                        • {ing ? ing.name : 'Unknown'}: {pkg.amount} {pkg.unit} ({formatRupiah(cost)})
                      </li>
                    );
                  })}
                </ul>
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
    </div>
  );
};

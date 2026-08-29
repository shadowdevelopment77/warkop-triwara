// ═══════════════════════════════════════════════
// Triwara POS — Vertical Menu List (Left Sidebar)
// ═══════════════════════════════════════════════

import React from 'react';
import type { IProduct } from '../../types';
import { formatRupiah } from '../../utils/currency';

interface MenuSidebarProps {
  products: IProduct[];
  onSelectProduct: (product: IProduct) => void;
}

export const MenuSidebar: React.FC<MenuSidebarProps> = ({ products, onSelectProduct }) => {
  return (
    <div className="menu-list-vertical">
      {products.length === 0 ? (
        <div className="empty-menu-state">
          <p>Belum ada menu produk.</p>
          <small>Tambah menu di Master -&gt; Produk &amp; Stok -&gt; Katalog Menu &amp; Resep</small>
        </div>
      ) : (
        products.map((product) => (
          <button
            key={product.id}
            type="button"
            className="menu-item-row"
            onClick={() => onSelectProduct(product)}
          >
            {/* 2-Letter Code Badge */}
            <span className="code-badge">[{product.codeBadge}]</span>

            {/* Product Details */}
            <div className="menu-item-info">
              <span className="menu-item-name">{product.name}</span>
              <span className="menu-item-desc">{product.description}</span>
            </div>

            {/* Price */}
            <span className="menu-item-price">{formatRupiah(product.price)}</span>
          </button>
        ))
      )}
    </div>
  );
};

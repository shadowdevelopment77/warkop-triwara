// ═══════════════════════════════════════════════
// Triwara POS — Vertical Menu List (Quick Add + "+ Additional")
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IProduct } from '../../types';
import { formatRupiah } from '../../utils/currency';
import { hppService, type IAvailabilityInfo } from '../../services/hpp.service';
import { DialogModal } from '../common/DialogModal';

interface MenuSidebarProps {
  products: IProduct[];
  onQuickAddToCart: (product: IProduct) => void;
  onOpenVariant: (product: IProduct) => void;
}

export const MenuSidebar: React.FC<MenuSidebarProps> = ({
  products,
  onQuickAddToCart,
  onOpenVariant,
}) => {
  const [stockStatus, setStockStatus] = useState<Record<number, IAvailabilityInfo>>({});
  const [stockAlert, setStockAlert] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkAllStocks = async () => {
      const statusMap: Record<number, IAvailabilityInfo> = {};
      for (const prod of products) {
        if (prod.id) {
          const avail = await hppService.checkStockAvailability(prod, 'dine_in', 1);
          statusMap[prod.id] = avail;
        }
      }
      if (isMounted) {
        setStockStatus(statusMap);
      }
    };

    checkAllStocks();
    return () => {
      isMounted = false;
    };
  }, [products]);

  const handleProductClick = (product: IProduct) => {
    const status = product.id ? stockStatus[product.id] : null;
    if (status && !status.isAvailable) {
      setStockAlert(
        `Maaf, menu "${product.name}" tidak dapat dipesan karena stok ${status.missingItemName || 'bahan baku'} habis.`
      );
      return;
    }
    onQuickAddToCart(product);
  };

  return (
    <div className="menu-list-vertical">
      {products.length === 0 ? (
        <div className="empty-menu-state" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 700, fontSize: '15px', color: '#fafafa' }}>Belum ada menu produk.</p>
          <small>Tambah menu di Hamburger -&gt; Produk &amp; Stok -&gt; Katalog Menu &amp; Resep</small>
        </div>
      ) : (
        products.map((product) => {
          const isAvailable = product.id && stockStatus[product.id] ? stockStatus[product.id].isAvailable : true;
          const missingName = product.id && stockStatus[product.id] ? stockStatus[product.id].missingItemName : undefined;

          return (
            <div
              key={product.id}
              className={`menu-item-row ${!isAvailable ? 'out-of-stock' : ''}`}
              onClick={() => handleProductClick(product)}
              style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
              title={isAvailable ? `Klik untuk tambah langsung 1x ${product.name}` : `Stok ${missingName || 'bahan'} habis`}
            >
              {/* Product Details */}
              <div className="menu-item-info">
                <span className="menu-item-name">
                  {product.name}
                  {!isAvailable && <span className="stock-out-badge">[HABIS]</span>}
                </span>
                <span className="menu-item-desc">
                  {!isAvailable && missingName ? `Stok ${missingName} habis` : product.description}
                </span>
              </div>

              {/* Price & + Additional Button */}
              <div className="menu-item-action-box">
                <span className="menu-item-price">{formatRupiah(product.price)}</span>
                {isAvailable ? (
                  <button
                    type="button"
                    className="btn-additional-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenVariant(product);
                    }}
                    title="Kustomisasi varian suhu, gula, dan extra topping"
                  >
                    + Additional
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--danger-color)', fontWeight: 700 }}>
                    Habis
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}

      <DialogModal
        isOpen={Boolean(stockAlert)}
        type="alert"
        title="Stok Tidak Cukup"
        message={stockAlert || ''}
        onConfirm={() => setStockAlert(null)}
        onClose={() => setStockAlert(null)}
      />
    </div>
  );
};

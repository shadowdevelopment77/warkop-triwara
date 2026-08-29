// ═══════════════════════════════════════════════
// Triwara POS — Cart Panel (Right Sidebar)
// ═══════════════════════════════════════════════

import React from 'react';
import type { ICartItem } from '../../types';
import { formatRupiah } from '../../utils/currency';

interface CartPanelProps {
  cartItems: ICartItem[];
  discountPercent: number;
  onUpdateQty: (cartId: string, delta: number) => void;
  onRemoveItem: (cartId: string) => void;
  onClearCart: () => void;
  onChangeDiscount: (percent: number) => void;
  onProceedToPayment: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cartItems,
  discountPercent,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onChangeDiscount,
  onProceedToPayment,
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const grandTotal = subtotal - discountAmount;

  return (
    <aside className="pos-right-column cart-panel-right">
      <div className="cart-panel-header">
        <h2 className="cart-panel-title">Pesanan Pelanggan</h2>
        {cartItems.length > 0 && (
          <button type="button" className="btn-clear-cart" onClick={onClearCart}>
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="cart-items-scroll">
        {cartItems.length === 0 ? (
          <div className="empty-cart-view">
            <p className="empty-cart-text">Keranjang Masih Kosong</p>
            <small>Pilih menu di sebelah kiri untuk menambah pesanan</small>
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.cartId} className="cart-item-card">
              <div className="cart-item-main">
                <span className="cart-item-badge">[{item.product.codeBadge}]</span>
                <div className="cart-item-details">
                  <span className="cart-item-title">{item.product.name}</span>
                  <div className="cart-item-tags">
                    <span className="tag-type">{item.orderType === 'takeaway' ? 'Takeaway' : 'Dine-In'}</span>
                    <span className="tag-variant">{item.temperature}</span>
                    <span className="tag-variant">{item.sugarLevel}</span>
                    {item.extraToppings.map((t) => (
                      <span key={t.name} className="tag-topping">
                        +{t.name}
                      </span>
                    ))}
                  </div>
                  {item.notes && <span className="cart-item-note">* {item.notes}</span>}
                </div>
                <button
                  type="button"
                  className="cart-item-delete-btn"
                  onClick={() => onRemoveItem(item.cartId)}
                  title="Hapus"
                >
                  ✕
                </button>
              </div>

              <div className="cart-item-sub">
                <span className="cart-item-total">{formatRupiah(item.itemPrice * item.quantity)}</span>
                <div className="cart-qty-stepper">
                  <button type="button" className="qty-btn" onClick={() => onUpdateQty(item.cartId, -1)}>
                    -
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => onUpdateQty(item.cartId, 1)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Discount & Total Summary */}
      {cartItems.length > 0 && (
        <div className="cart-panel-footer">
          {/* Discount Section: Label + Reset, Manual Input First, Presets Second */}
          <div className="discount-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="discount-label" style={{ margin: 0 }}>Diskon Penjualan (%)</label>
              {discountPercent > 0 && (
                <button
                  type="button"
                  style={{ fontSize: '11px', color: 'var(--danger-color)', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => onChangeDiscount(0)}
                  title="Reset diskon ke 0%"
                >
                  ✕ Reset Diskon
                </button>
              )}
            </div>

            {/* Manual % Input Immediately Below Label */}
            <div className="discount-manual-input" style={{ width: '100%' }}>
              <input
                type="number"
                min="0"
                max="100"
                className="discount-input"
                placeholder="Input diskon % manual..."
                value={discountPercent || ''}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                  onChangeDiscount(val);
                }}
              />
              <span className="percent-symbol">%</span>
            </div>

            {/* Quick Percentage Helper Buttons */}
            <div className="discount-helpers">
              {[10, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`discount-helper-btn ${discountPercent === pct ? 'active' : ''}`}
                  onClick={() => onChangeDiscount(discountPercent === pct ? 0 : pct)}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Calculation Rows */}
          <div className="cart-calc-rows">
            <div className="calc-row">
              <span>Subtotal Menu</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="calc-row discount">
                <span>Diskon ({discountPercent}%)</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="calc-row grand-total">
              <span>TOTAL BAYAR</span>
              <span className="grand-total-val">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          {/* Checkout Action Button */}
          <button type="button" className="btn-pay-now" onClick={onProceedToPayment}>
            BAYAR — {formatRupiah(grandTotal)}
          </button>
        </div>
      )}
    </aside>
  );
};

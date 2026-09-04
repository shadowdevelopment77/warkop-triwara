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
  onHoldOrder: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cartItems,
  discountPercent,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onChangeDiscount,
  onProceedToPayment,
  onHoldOrder,
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const grandTotal = subtotal - discountAmount;
  const [isDiscountOpen, setIsDiscountOpen] = React.useState<boolean>(discountPercent > 0);
  const [discountStr, setDiscountStr] = React.useState<string>(discountPercent > 0 ? String(discountPercent) : '');

  React.useEffect(() => {
    setDiscountStr(discountPercent > 0 ? String(discountPercent) : '');
    if (discountPercent > 0) {
      setIsDiscountOpen(true);
    }
  }, [discountPercent]);

  const handleDiscountChange = (val: string) => {
    setDiscountStr(val);
    if (val === '') {
      onChangeDiscount(0);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const clamped = Math.min(100, Math.max(0, num));
      onChangeDiscount(clamped);
    }
  };

  const handleApplyPreset = (pct: number) => {
    if (discountPercent === pct) {
      onChangeDiscount(0);
      setDiscountStr('');
    } else {
      onChangeDiscount(pct);
      setDiscountStr(String(pct));
    }
  };

  return (
    <aside className="pos-right-column cart-panel-right">
      <div className="cart-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 className="cart-panel-title">Pesanan</h2>
        </div>
        {cartItems.length > 0 && (
          <button type="button" className="btn-clear-cart" onClick={onClearCart}>
            Reset
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

      {/* Discount & Total Summary Footer */}
      {cartItems.length > 0 && (
        <div className="cart-panel-footer">
          {/* Collapsible On-Demand Discount Bar */}
          {!isDiscountOpen && discountPercent === 0 ? (
            <button
              type="button"
              className="btn-add-discount-trigger"
              onClick={() => setIsDiscountOpen(true)}
            >
              <span>Discount</span>
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Pilih % Diskon</span>
            </button>
          ) : (
            <div className="discount-compact-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                  Diskon: {discountPercent}%
                </span>
                <button
                  type="button"
                  style={{ fontSize: '11px', color: 'var(--danger-color)', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    onChangeDiscount(0);
                    setDiscountStr('');
                    setIsDiscountOpen(false);
                  }}
                >
                  ✕ Batal
                </button>
              </div>

              <div className="discount-compact-row">
                <div className="discount-manual-input">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    className="discount-input"
                    placeholder="0%"
                    value={discountStr}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                  />
                </div>
                <div className="discount-helpers">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      className={`discount-helper-btn ${discountPercent === pct ? 'active' : ''}`}
                      onClick={() => handleApplyPreset(pct)}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pricing Calculation Rows */}
          <div className="cart-calc-rows">
            <div className="calc-row">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="calc-row discount">
                <span>Diskon ({discountPercent}%)</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <div className="calc-row grand-total">
              <span>TOTAL</span>
              <span>{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          <div className="cart-payment-actions">
            <button type="button" className="btn-hold-order" onClick={onHoldOrder}>
              Simpan Pesanan
            </button>
            <button type="button" className="btn-pay-now" onClick={onProceedToPayment}>
              Bayar Sekarang • {formatRupiah(grandTotal)}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

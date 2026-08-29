// ═══════════════════════════════════════════════
// Triwara POS — Product Customization Variant Modal
// ═══════════════════════════════════════════════

import React, { useState } from 'react';
import type { IProduct, OrderType, TemperatureOption, ICartItem } from '../../types';
import { formatRupiah } from '../../utils/currency';

interface VariantModalProps {
  product: IProduct | null;
  onClose: () => void;
  onAddToCart: (cartItem: ICartItem) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({ product, onClose, onAddToCart }) => {
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [temperature, setTemperature] = useState<TemperatureOption>('Iced');
  const [sugarLevel, setSugarLevel] = useState<string>('Normal (100%)');
  const [selectedToppings, setSelectedToppings] = useState<
    { name: string; price: number; amount?: number }[]
  >([]);
  const [notes, setNotes] = useState<string>('');

  if (!product) return null;

  const toppingPresets = [
    { name: 'Extra Shot Espresso', price: 5000 },
    { name: 'Oat Milk Sub', price: 6000 },
    { name: 'Syrup Vanilla', price: 4000 },
    { name: 'Syrup Caramel', price: 4000 },
  ];

  const handleToggleTopping = (topping: { name: string; price: number }) => {
    const exists = selectedToppings.find((t) => t.name === topping.name);
    if (exists) {
      setSelectedToppings(selectedToppings.filter((t) => t.name !== topping.name));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const toppingsTotalPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const itemFinalPrice = product.price + toppingsTotalPrice;

  const handleConfirm = () => {
    const cartItem: ICartItem = {
      cartId: `${product.id}-${Date.now()}`,
      product,
      quantity: 1,
      orderType,
      temperature,
      sugarLevel,
      extraToppings: selectedToppings,
      notes: notes.trim(),
      itemPrice: itemFinalPrice,
      itemHpp: 0, // Calculated dynamically by OrderService snapshot
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card variant-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              [{product.codeBadge}] {product.name}
            </h3>
            <span className="modal-subtitle">Atur Varian &amp; Opsi Pesanan</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [✕]
          </button>
        </div>

        <div className="modal-body">
          {/* Order Type: Dine In vs Takeaway */}
          <div className="form-group">
            <label className="form-label">Tipe Penyajian</label>
            <div className="btn-toggle-group">
              <button
                type="button"
                className={`toggle-btn ${orderType === 'dine_in' ? 'active' : ''}`}
                onClick={() => setOrderType('dine_in')}
              >
                Dine-In (Mug / Piring)
              </button>
              <button
                type="button"
                className={`toggle-btn ${orderType === 'takeaway' ? 'active' : ''}`}
                onClick={() => setOrderType('takeaway')}
              >
                Takeaway (Kemasan Cup/Bag)
              </button>
            </div>
          </div>

          {/* Temperature */}
          <div className="form-group">
            <label className="form-label">Suhu Minuman</label>
            <div className="btn-toggle-group">
              <button
                type="button"
                className={`toggle-btn ${temperature === 'Iced' ? 'active' : ''}`}
                onClick={() => setTemperature('Iced')}
              >
                Dingin (Iced)
              </button>
              <button
                type="button"
                className={`toggle-btn ${temperature === 'Hot' ? 'active' : ''}`}
                onClick={() => setTemperature('Hot')}
              >
                Panas (Hot)
              </button>
            </div>
          </div>

          {/* Sugar Level */}
          <div className="form-group">
            <label className="form-label">Tingkat Manis (Sugar Level)</label>
            <div className="btn-toggle-group">
              {['Normal (100%)', 'Less Sugar (50%)', 'No Sugar (0%)'].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`toggle-btn ${sugarLevel === level ? 'active' : ''}`}
                  onClick={() => setSugarLevel(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Extra Toppings */}
          <div className="form-group">
            <label className="form-label">Tambahan / Extra Topping</label>
            <div className="toppings-grid">
              {toppingPresets.map((t) => {
                const isSelected = selectedToppings.some((st) => st.name === t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    className={`topping-checkbox-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleTopping(t)}
                  >
                    <span>{t.name}</span>
                    <small>+{formatRupiah(t.price)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Notes */}
          <div className="form-group">
            <label className="form-label">Catatan Pesanan (Opsional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cth: Sedikit es, tanpa sedotan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm}>
            Tambah ke Keranjang ({formatRupiah(itemFinalPrice)})
          </button>
        </div>
      </div>
    </div>
  );
};

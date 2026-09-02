import React from 'react';
import type { IHeldOrder } from '../../types';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';

interface HeldOrdersModalProps {
  heldOrders: IHeldOrder[];
  onClose: () => void;
  onSelect: (order: IHeldOrder) => void;
  onDelete: (order: IHeldOrder) => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({
  heldOrders,
  onClose,
  onSelect,
  onDelete,
}) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="pos-modal-card payment-modal-card" onClick={(event) => event.stopPropagation()}>
      <div className="pos-modal-header">
        <h3 className="pos-modal-title">Pesanan Tersimpan ({heldOrders.length})</h3>
        <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">✕</button>
      </div>
      <div className="pos-modal-body">
        {heldOrders.length === 0 ? (
          <div className="empty-cart-view"><p className="empty-cart-text">Belum Ada Pesanan Tersimpan</p></div>
        ) : (
          <div className="held-orders-list">
            {heldOrders.map((order) => {
              const menuNames = order.cartItems.slice(0, 2).map((item) => item.product.name);
              const remainingMenus = order.cartItems.length - menuNames.length;
              const subtotal = order.cartItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
              const total = subtotal - Math.round((subtotal * order.discountPercent) / 100);
              const itemCount = order.cartItems.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="held-order-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(order)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(order);
                    }
                  }}
                >
                  <div className="held-order-card-header">
                    <span className="held-order-customer">{order.customerName || 'Umum'}</span>
                    <button
                      type="button"
                      className="held-order-delete"
                      title="Hapus pesanan"
                      aria-label={`Hapus pesanan ${order.customerName || 'Umum'}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(order);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="held-order-menu">
                    {menuNames.join(', ')}{remainingMenus > 0 ? ', …' : ''}
                  </div>
                  <div className="held-order-card-footer">
                    <span className="held-order-time">{itemCount} item • {formatDateIndonesian(order.createdAt)}</span>
                    <span className="held-order-total">{formatRupiah(total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

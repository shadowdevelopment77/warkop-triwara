// ═══════════════════════════════════════════════
// Triwara POS — 58mm Thermal Receipt Preview & 3-Action Print Modal
// ═══════════════════════════════════════════════

import React from 'react';
import type { IOrder, IShopConfig } from '../../types';
import type { ReceiptType } from '../../services/receipt.service';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';

interface PrintSelectModalProps {
  order: IOrder;
  shopConfig?: IShopConfig | null;
  onClose: () => void;
  onConfirmPrint: (selectedTypes: ReceiptType[]) => void;
}

export const PrintSelectModal: React.FC<PrintSelectModalProps> = ({
  order,
  shopConfig,
  onClose,
  onConfirmPrint,
}) => {
  const handlePrintSingle = (type: ReceiptType) => {
    onConfirmPrint([type]);
  };

  const headerLines = shopConfig?.receiptHeaderLines || [
    'Warkop Triwara Coffee',
    'Jl. Sunset Road No. 88, Bali',
    'Telp: 0812-3456-7890',
  ];

  const footerLines = shopConfig?.receiptFooterLines || [
    'Terima Kasih Atas Kunjungan Anda!',
    'WiFi: Triwara_Guest | Pass: kopienak',
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card print-select-card"
        style={{ maxWidth: '420px', maxHeight: '90dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Cetak Struk Thermal</h3>
            <span className="modal-subtitle">Order #{order.orderNumber}</span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        {/* 3 Print Buttons Bar */}
        <div className="receipt-print-actions-bar">
          <button
            type="button"
            className="btn-print-choice"
            onClick={() => handlePrintSingle('customer')}
            title="Cetak Struk untuk Pelanggan"
          >
            <span style={{ fontSize: '16px' }}>🖨️</span>
            <span>Struk Customer</span>
          </button>

          <button
            type="button"
            className="btn-print-choice"
            onClick={() => handlePrintSingle('bar')}
            title="Cetak Struk untuk Bar Minuman"
          >
            <span style={{ fontSize: '16px' }}>🍸</span>
            <span>Struk Bar</span>
          </button>

          <button
            type="button"
            className="btn-print-choice"
            onClick={() => handlePrintSingle('kitchen')}
            title="Cetak Struk untuk Dapur Makanan"
          >
            <span style={{ fontSize: '16px' }}>🍳</span>
            <span>Struk Dapur</span>
          </button>
        </div>

        {/* Realistic 58mm Thermal Receipt Paper Preview */}
        <div className="modal-body" style={{ padding: '16px', backgroundColor: '#18181b' }}>
          <div className="thermal-receipt-paper-preview">
            {/* Header / Store Branding */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase' }}>
                {shopConfig?.appName || 'Warkop Triwara'}
              </div>
              {headerLines.map((h, i) => (
                <div key={i} style={{ fontSize: '9px', color: '#333333' }}>
                  {h}
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />

            {/* Meta Rows */}
            <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>No. Struk:</span>
                <strong>{order.orderNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Waktu:</span>
                <span>{formatDateIndonesian(order.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pelanggan:</span>
                <strong>{order.customerName || 'Umum'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tipe:</span>
                <span>[{order.items[0]?.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN'}]</span>
              </div>
            </div>

            <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />

            {/* Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>
                      {item.productName} x{item.qty}
                    </span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                  {item.orderType === 'takeaway' && (
                    <div style={{ fontSize: '9px', color: '#555555', paddingLeft: '8px' }}>
                      • Takeaway
                    </div>
                  )}
                  {item.toppings.map((t, ti) => (
                    <div key={ti} style={{ fontSize: '9px', color: '#555555', paddingLeft: '8px' }}>
                      • {t.name}
                    </div>
                  ))}
                  {item.notes && (
                    <div style={{ fontSize: '9px', color: '#555555', fontStyle: 'italic', paddingLeft: '8px' }}>
                      Catatan: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />

            {/* Price Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Diskon ({order.discountPercent}%):</span>
                  <span>-{formatRupiah(order.discountAmount)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '12px',
                  borderTop: '1px solid #000000',
                  paddingTop: '3px',
                  marginTop: '2px',
                }}
              >
                <span>TOTAL:</span>
                <span>{formatRupiah(order.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>Bayar ({order.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}):</span>
                <span>{formatRupiah(order.paymentAmount)}</span>
              </div>
              {order.paymentMethod === 'cash' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kembali:</span>
                  <span>{formatRupiah(order.changeAmount)}</span>
                </div>
              )}
            </div>

            <div style={{ borderBottom: '1px dashed #000000', margin: '6px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#444444' }}>
              {footerLines.map((f, i) => (
                <div key={i}>{f}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};

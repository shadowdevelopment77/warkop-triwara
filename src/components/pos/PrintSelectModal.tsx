// ═══════════════════════════════════════════════
// Triwara POS — 58mm Thermal Receipt Preview & 3-Action Print Modal
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IOrder, IShopConfig } from '../../types';
import type { ReceiptType } from '../../services/receipt.service';
import { configService } from '../../services/config.service';
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
  const [activeConfig, setActiveConfig] = useState<IShopConfig | null>(shopConfig || null);
  const [printedStatus, setPrintedStatus] = useState<string | null>(null);

  useEffect(() => {
    configService.getConfig().then(setActiveConfig);
  }, []);

  const handlePrintSingle = (type: ReceiptType) => {
    onConfirmPrint([type]);
    const label =
      type === 'customer' ? 'Struk Customer' : type === 'bar' ? 'Struk Bar' : 'Struk Dapur';
    setPrintedStatus(`${label} berhasil dikirim ke printer thermal.`);
  };

  const headerLines = activeConfig?.receiptHeaderLines || [
    'Warkop Triwara Coffee',
    'Jl. Sunset Road No. 88, Bali',
    'Telp: 0812-3456-7890',
  ];

  const footerLines = activeConfig?.receiptFooterLines || [
    'Terima Kasih Atas Kunjungan Anda!',
    'WiFi: Triwara_Guest | Pass: kopienak',
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '440px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="inv-modal-header" style={{ flexShrink: 0 }}>
          <div>
            <h3 className="inv-modal-title">Cetak Struk Thermal</h3>
            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
              Order #{order.orderNumber} ({order.customerName || 'Umum'})
            </span>
          </div>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="inv-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
            Pratinjau struk thermal 58mm untuk pesanan #{order.orderNumber}:
          </p>

          {/* Realistic 58mm Thermal Receipt Paper Preview */}
          <div style={{ backgroundColor: '#18181b', padding: '12px', borderRadius: '8px' }}>
            <div className="thermal-receipt-paper-preview">
              {/* Header / Store Branding */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                {activeConfig?.receiptLogoBase64 && (
                  <div style={{ marginBottom: '6px' }}>
                    <img
                      src={activeConfig.receiptLogoBase64}
                      alt="Logo Struk"
                      style={{
                        maxHeight: '48px',
                        maxWidth: '160px',
                        objectFit: 'contain',
                        filter: 'grayscale(100%) contrast(150%)',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase' }}>
                  {activeConfig?.appName || 'Warkop Triwara'}
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
                  <span>{order.items[0]?.orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE-IN'}</span>
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

              {/* Zigzag Paper Tear Cut */}
              <div className="thermal-receipt-tear-cut" />
            </div>
          </div>

          {/* 3 Print Buttons Bar Below Preview */}
          <div className="receipt-print-actions-bar" style={{ flexShrink: 0 }}>
            <button
              type="button"
              className="btn-print-choice"
              onClick={() => handlePrintSingle('customer')}
              title="Cetak Struk untuk Pelanggan"
            >
              <span>Struk Customer</span>
            </button>

            <button
              type="button"
              className="btn-print-choice"
              onClick={() => handlePrintSingle('bar')}
              title="Cetak Struk untuk Bar Minuman"
            >
              <span>Struk Bar</span>
            </button>

            <button
              type="button"
              className="btn-print-choice"
              onClick={() => handlePrintSingle('kitchen')}
              title="Cetak Struk untuk Dapur Makanan"
            >
              <span>Struk Dapur</span>
            </button>
          </div>

          {printedStatus && (
            <div style={{ textAlign: 'center', color: '#4ade80', fontSize: '12px', marginTop: '2px', fontWeight: 600, flexShrink: 0 }}>
              ✓ {printedStatus}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="inv-modal-footer" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className="shift-btn-primary"
            style={{ width: '100%', height: '40px', justifyContent: 'center' }}
            onClick={onClose}
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

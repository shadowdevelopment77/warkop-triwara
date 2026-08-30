// ═══════════════════════════════════════════════
// Triwara POS — Transaction History Panel (Cashier & Owner)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IOrder } from '../../types';
import { orderService } from '../../services/order.service';
import { formatDateIndonesian } from '../../utils/date';
import { formatRupiah } from '../../utils/currency';
import { PaginationBar } from '../common/PaginationBar';
import { VoidModal } from './VoidModal';

interface TransactionHistoryPanelProps {
  onReprintOrder: (order: IOrder) => void;
}

export const TransactionHistoryPanel: React.FC<TransactionHistoryPanelProps> = ({
  onReprintOrder,
}) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [voidingOrder, setVoidingOrder] = useState<IOrder | null>(null);

  // Date filters (defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const loadOrders = useCallback(async () => {
    try {
      const start = startDate ? new Date(`${startDate}T00:00:00`) : undefined;
      const end = endDate ? new Date(`${endDate}T23:59:59`) : undefined;
      const list = await orderService.getOrders(start, end);
      setOrders(list);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(today);
    setCurrentPage(1);
  };

  const handleConfirmVoid = async (reason: string) => {
    if (!voidingOrder?.id) return;
    try {
      await orderService.voidOrder(voidingOrder.id, reason);
      setVoidingOrder(null);
      await loadOrders();
    } catch (err) {
      alert('Gagal membatalkan transaksi: ' + (err as Error).message);
    }
  };

  return (
    <div className="report-view-container">
      {/* Header */}
      <div className="report-view-header">
        <div>
          <h2 className="report-view-title">Riwayat Transaksi Penjualan</h2>
        </div>
      </div>

      {/* Responsive Period Filter Bar (Matching ReportPanel) */}
      <div className="report-period-filter-bar">
        <div className="report-date-input-group">
          <label>Mulai:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="report-date-input-group">
          <label>Sampai:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="report-preset-buttons">
          <button
            type="button"
            className={`report-filter-pill ${startDate === todayStr && endDate === todayStr ? 'active' : ''}`}
            onClick={handleSetToday}
          >
            Hari Ini
          </button>
          <button
            type="button"
            className="report-filter-pill"
            onClick={handleSetThisMonth}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* Transaction Table Card */}
      <div className="report-section-card">
        <div className="report-table-wrapper">
          <table className="report-data-table">
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>Kasir</th>
                <th>Pelanggan</th>
                <th>Waktu</th>
                <th>Total</th>
                <th>Metode</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-table-td">
                    Belum ada riwayat transaksi pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                orders
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((order) => (
                    <tr key={order.id} className={order.status === 'voided' ? 'row-voided' : ''}>
                      <td>
                        <strong>#{order.orderNumber}</strong>
                      </td>
                      <td style={{ color: '#60a5fa', fontWeight: 600 }}>
                        {order.processedBy || 'Kasir'}
                      </td>
                      <td>{order.customerName || 'Umum'}</td>
                      <td style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        {formatDateIndonesian(order.createdAt)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#fafafa' }}>
                        {formatRupiah(order.total)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: order.paymentMethod === 'cash' ? '#27272a' : '#1e3a8a',
                            color: order.paymentMethod === 'cash' ? '#fafafa' : '#93c5fd',
                            textTransform: 'uppercase',
                          }}
                        >
                          {order.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${order.status === 'completed' ? 'safe' : 'critical'}`}
                        >
                          {order.status === 'completed' ? 'Sukses' : 'Batal / Void'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="report-btn-print"
                            onClick={() => onReprintOrder(order)}
                            title="Cetak Ulang Struk Pelanggan"
                          >
                            🖨️ Cetak
                          </button>
                          {order.status === 'completed' ? (
                            <button
                              type="button"
                              className="report-btn-void"
                              onClick={() => setVoidingOrder(order)}
                              title="Batalkan (Void) Transaksi"
                            >
                              🚫 Void
                            </button>
                          ) : (
                            <span className="report-voided-label" title={`Alasan: ${order.voidReason || 'Dibatalkan'}`}>
                              Dibatalkan
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          <PaginationBar
            currentPage={currentPage}
            totalItems={orders.length}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Void Modal */}
      {voidingOrder && (
        <VoidModal
          order={voidingOrder}
          onClose={() => setVoidingOrder(null)}
          onConfirmVoid={handleConfirmVoid}
        />
      )}
    </div>
  );
};

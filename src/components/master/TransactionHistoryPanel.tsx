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
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Client-side search filtering
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      (order.customerName || '').toLowerCase().includes(q) ||
      (order.processedBy || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="report-view-container">
      {/* Header */}
      <div className="report-view-header">
        <div>
          <h2 className="report-view-title">Riwayat Transaksi Penjualan</h2>
        </div>
      </div>

      {/* Filter Bar: Date Range + Quick Buttons + Search */}
      <div className="report-filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Periode:</span>
          <input
            type="date"
            className="log-date-input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
          />
          <span style={{ color: '#71717a' }}>—</span>
          <input
            type="date"
            className="log-date-input"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`log-filter-pill ${startDate === todayStr && endDate === todayStr ? 'active' : ''}`}
            onClick={handleSetToday}
          >
            Hari Ini
          </button>
          <button
            type="button"
            className="log-filter-pill"
            onClick={handleSetThisMonth}
          >
            Bulan Ini
          </button>
        </div>

        <div style={{ marginLeft: 'auto', minWidth: '220px' }}>
          <input
            type="text"
            className="form-input"
            style={{ height: '34px', fontSize: '12px' }}
            placeholder="Cari ID / Kasir / Pelanggan..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Transaction Table */}
      <div className="report-section-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#a1a1aa' }}>
                    Tidak ada riwayat transaksi pada periode yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredOrders
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((order) => (
                    <tr key={order.id}>
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
                          className={`report-status-badge ${order.status === 'completed' ? 'success' : 'voided'}`}
                        >
                          {order.status === 'completed' ? 'Sukses' : 'Void'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="shift-btn-action"
                            onClick={() => onReprintOrder(order)}
                            title="Cetak Ulang Struk Pelanggan"
                          >
                            🖨️ Cetak Struk
                          </button>
                          {order.status === 'completed' && (
                            <button
                              type="button"
                              className="menu-btn-icon-danger"
                              onClick={() => setVoidingOrder(order)}
                              title="Batalkan (Void) Transaksi"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length > 10 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={10}
          onPageChange={setCurrentPage}
        />
      )}

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

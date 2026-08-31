// ═══════════════════════════════════════════════
// Triwara POS — Transaction History Panel (Cashier & Owner)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IOrder } from '../../types';
import { orderService } from '../../services/order.service';
import { pdfService } from '../../services/pdf.service';
import { configService } from '../../services/config.service';
import { formatDateIndonesian } from '../../utils/date';
import { formatRupiah } from '../../utils/currency';
import { PaginationBar } from '../common/PaginationBar';
import { VoidModal } from './VoidModal';

interface TransactionHistoryPanelProps {
  onReprintOrder: (order: IOrder) => void;
}

type PeriodPreset = 'today' | 'month' | 'custom';

const toInputDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TransactionHistoryPanel: React.FC<TransactionHistoryPanelProps> = ({
  onReprintOrder,
}) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [voidingOrder, setVoidingOrder] = useState<IOrder | null>(null);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<{
    isOpen: boolean;
    percent: number;
    message: string;
  } | null>(null);

  // Date filters (defaults to today)
  const now = new Date();
  const initialStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const initialEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [startDate, setStartDate] = useState<Date>(initialStart);
  const [endDate, setEndDate] = useState<Date>(initialEnd);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('today');

  const loadOrders = useCallback(async () => {
    try {
      setIsPageLoading(true);
      const result = await orderService.getPaginatedOrders(startDate, endDate, currentPage, 10);
      setOrders(result.orders);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setIsPageLoading(false);
    }
  }, [startDate, endDate, currentPage]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handlePageChange = (newPage: number) => {
    if (isPageLoading) return; // Prevent rapid-fire multi-click jump
    setCurrentPage(newPage);
  };

  const handleSelectPreset = (preset: 'today' | 'month') => {
    setPeriodPreset(preset);
    setCurrentPage(1);
    const cur = new Date();
    if (preset === 'today') {
      const start = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 0, 0, 0);
      const end = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 23, 59, 59);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'month') {
      const start = new Date(cur.getFullYear(), cur.getMonth(), 1, 0, 0, 0);
      const end = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
      setStartDate(start);
      setEndDate(end);
    }
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

  const handleExportPdf = async () => {
    try {
      setPdfProgress({ isOpen: true, percent: 5, message: 'Menyiapkan data...' });
      const config = await configService.getConfig();
      // fetch up to 500 orders for PDF export
      const ordersToExport = await orderService.getOrders(startDate, endDate, 500);
      await pdfService.exportTransactionHistoryReport(
        startDate,
        endDate,
        ordersToExport,
        config,
        (percent, message) => setPdfProgress({ isOpen: true, percent, message })
      );
      setTimeout(() => setPdfProgress(null), 800);
    } catch (err) {
      console.error(err);
      setPdfProgress(null);
      alert('Gagal mengekspor PDF: ' + (err as Error).message);
    }
  };

  return (
    <div className="report-view-container">
      {/* Header */}
      <div className="report-view-header">
        <h2 className="report-view-title">Riwayat Transaksi Penjualan</h2>
        <button
          type="button"
          className="report-btn-primary report-btn-export"
          onClick={handleExportPdf}
          disabled={Boolean(pdfProgress?.isOpen)}
        >
          {pdfProgress?.isOpen ? 'Mengekspor...' : '📄 Export PDF'}
        </button>
      </div>

      {/* Responsive Period Filter Bar (Matching ReportPanel) */}
      <div className="report-period-filter-bar">
        <div className="report-date-input-group">
          <label>Mulai:</label>
          <input
            type="date"
            value={toInputDateString(startDate)}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                setStartDate(new Date(y, m - 1, d, 0, 0, 0));
                setPeriodPreset('custom');
                setCurrentPage(1);
              }
            }}
          />
        </div>

        <div className="report-date-input-group">
          <label>Sampai:</label>
          <input
            type="date"
            value={toInputDateString(endDate)}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                setEndDate(new Date(y, m - 1, d, 23, 59, 59));
                setPeriodPreset('custom');
                setCurrentPage(1);
              }
            }}
          />
        </div>

        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'today' ? 'active' : ''}`}
          onClick={() => handleSelectPreset('today')}
        >
          Hari Ini
        </button>
        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'month' ? 'active' : ''}`}
          onClick={() => handleSelectPreset('month')}
        >
          Bulan Ini
        </button>
        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'custom' ? 'active' : ''}`}
          onClick={() => setPeriodPreset('custom')}
        >
          Kustom
        </button>
      </div>

      {/* Transaction Table Card */}
      <div className="report-section-card" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Subtle Top Progress Bar during cold fetches */}
        {isPageLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: '#3b82f6',
              zIndex: 10,
            }}
          />
        )}
        <div className="report-table-wrapper">
          <table
            className="report-data-table"
            style={{
              opacity: isPageLoading ? 0.4 : 1,
              transition: 'opacity 0.12s ease-in-out',
              pointerEvents: isPageLoading ? 'none' : 'auto',
            }}
          >
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
                orders.map((order) => (
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
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {formatRupiah(order.total)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: order.paymentMethod === 'cash' ? '#f1f5f9' : '#dbeafe',
                            color: order.paymentMethod === 'cash' ? '#0f172a' : '#1d4ed8',
                            border: order.paymentMethod === 'cash' ? '1px solid #cbd5e1' : '1px solid #93c5fd',
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
                          {order.status === 'completed' ? (
                            <>
                              <button
                                type="button"
                                className="report-btn-print"
                                onClick={() => onReprintOrder(order)}
                                title="Cetak Ulang Struk Pelanggan"
                              >
                                🖨️ Cetak
                              </button>
                              <button
                                type="button"
                                className="report-btn-void"
                                onClick={() => setVoidingOrder(order)}
                                title="Batalkan (Void) Transaksi"
                              >
                                🚫 Void
                              </button>
                            </>
                          ) : (
                            <span
                              className="report-voided-label"
                              title={`Alasan: ${order.voidReason || 'Dibatalkan'}`}
                              style={{
                                color: '#ef4444',
                                fontWeight: 700,
                                fontSize: '12px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                              }}
                            >
                              🚫 Dibatalkan
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
            totalItems={totalCount}
            pageSize={10}
            disabled={isPageLoading}
            onPageChange={handlePageChange}
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

      {/* PDF Export Progress Modal */}
      {pdfProgress && pdfProgress.isOpen && (
        <div className="modal-backdrop" style={{ zIndex: 9999 }}>
          <div
            className="settings-modal-card"
            style={{
              maxWidth: '380px',
              width: '90%',
              textAlign: 'center',
              padding: '24px',
              backgroundColor: '#18181b',
              border: '1px solid #3b82f6',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#f4f4f5' }}>
              📄 Mengekspor Riwayat Transaksi PDF
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#93c5fd' }}>
              {pdfProgress.message}
            </p>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#27272a',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pdfProgress.percent}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.2s linear',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block', marginTop: '8px' }}>
              {pdfProgress.percent}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

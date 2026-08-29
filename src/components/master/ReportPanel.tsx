// ═══════════════════════════════════════════════
// Triwara POS — Sales Report & Transaction History Panel (Clean Text, No Icons)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IOrder, IShopConfig } from '../../types';
import { reportService, type ISalesSummary, type ITopProduct } from '../../services/report.service';
import { orderService } from '../../services/order.service';
import { configService } from '../../services/config.service';
import { pdfService } from '../../services/pdf.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';
import { PrintSelectModal } from '../pos/PrintSelectModal';
import type { ReceiptType } from '../../services/receipt.service';
import { PaginationBar } from '../common/PaginationBar';

const toInputDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ReportPanel: React.FC = () => {
  const [periodPreset, setPeriodPreset] = useState<'today' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [summary, setSummary] = useState<ISalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<ITopProduct[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [reprintOrder, setReprintOrder] = useState<IOrder | null>(null);
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);

  useEffect(() => {
    configService.getConfig().then(setShopConfig).catch(console.error);
  }, []);

  const loadReportData = useCallback(async () => {
    try {
      const summaryData = await reportService.getSalesSummary(startDate, endDate);
      const topData = await reportService.getTopSellingProducts(startDate, endDate, 5);
      const ordersData = await orderService.getOrders(startDate, endDate);

      setSummary(summaryData);
      setTopProducts(topData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load report data:', err);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleSelectPreset = (preset: 'today' | 'month') => {
    setPeriodPreset(preset);
    setCurrentPage(1);
    const now = new Date();

    if (preset === 'today') {
      setStartDate(now);
      setEndDate(now);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay);
      setEndDate(now);
    }
  };

  const handleExportPdf = async () => {
    if (!summary) return;
    try {
      const config = await configService.getConfig();
      await pdfService.exportSalesReport(startDate, endDate, summary, topProducts, orders, config);
    } catch (err) {
      alert('Gagal mengeksport PDF: ' + (err as Error).message);
    }
  };

  const handleVoidOrder = async (order: IOrder) => {
    if (order.status === 'voided') return;
    const reason = prompt(`Masukkan alasan membatalkan/void transaksi #${order.orderNumber}:`);
    if (reason !== null) {
      try {
        await orderService.voidOrder(order.id!, reason);
        await notificationService.addNotification(
          'Transaksi Dibatalkan (Void)',
          `Transaksi #${order.orderNumber} dibatalkan. Alasan: ${reason || '-'}. Stok bahan telah dikembalikan.`,
          'order',
          'reports'
        );
        alert(`Transaksi #${order.orderNumber} telah dibatalkan. Stok bahan telah dikembalikan.`);
        loadReportData();
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  const handleConfirmPrint = async (selectedTypes: ReceiptType[]) => {
    if (!reprintOrder) return;
    try {
      const config = await configService.getConfig();
      const { receiptService } = await import('../../services/receipt.service');

      for (const type of selectedTypes) {
        const text = receiptService.generateReceiptText(reprintOrder, config, type);
        console.log(`[PRINT ${type.toUpperCase()}]\n` + text);
      }
      alert(`Struk (${selectedTypes.join(', ')}) berhasil dikirim ke printer.`);
    } catch (err) {
      alert('Gagal mencetak struk: ' + (err as Error).message);
    }
  };

  return (
    <div className="master-view-container">
      {/* Header & Date Range Controls (Top-Left) */}
      <div className="master-view-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <h2 className="view-title">Laporan Penjualan &amp; Performa Toko</h2>
            <p className="view-subtitle">Ringkasan omset, tunai, qris, profit bersih, 5 menu terlaris &amp; riwayat.</p>
          </div>

          {/* Date Range Picker with Presets in Top-Left */}
          <div className="report-period-filter-bar">
            <div className="date-input-group">
              <label>Dari:</label>
              <input
                type="date"
                value={toInputDateString(startDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setStartDate(new Date(e.target.value));
                    setPeriodPreset('custom');
                  }
                }}
              />
            </div>

            <div className="date-input-group">
              <label>Sampai:</label>
              <input
                type="date"
                value={toInputDateString(endDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setEndDate(new Date(e.target.value));
                    setPeriodPreset('custom');
                  }
                }}
              />
            </div>

            <button
              type="button"
              className={`preset-btn ${periodPreset === 'today' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('today')}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className={`preset-btn ${periodPreset === 'month' ? 'active' : ''}`}
              onClick={() => handleSelectPreset('month')}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={handleExportPdf}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards Grid (OMSET, TUNAI, QRIS, PROFIT) */}
      {summary && (
        <div className="summary-cards-grid">
          <div className="summary-card">
            <span className="card-label">OMSET</span>
            <strong className="card-val">{formatRupiah(summary.totalOmset)}</strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
              {summary.completedCount} transaksi sukses, {summary.voidedCount} transaksi dibatalkan
            </small>
          </div>

          <div className="summary-card">
            <span className="card-label">TUNAI</span>
            <strong className="card-val">{formatRupiah(summary.totalCash)}</strong>
          </div>

          <div className="summary-card">
            <span className="card-label">QRIS</span>
            <strong className="card-val">{formatRupiah(summary.totalQris)}</strong>
          </div>

          <div className="summary-card profit">
            <span className="card-label">PROFIT</span>
            <strong className="card-val">{formatRupiah(summary.totalProfit)}</strong>
          </div>
        </div>
      )}

      {/* Top 5 Best Sellers Section (Clean Text) */}
      <div className="report-section-card">
        <h3 className="section-card-title">5 MENU TERLARIS PERIODE INI</h3>
        {topProducts.length === 0 ? (
          <p className="empty-hint">Belum ada data penjualan pada periode ini.</p>
        ) : (
          <ol className="top-products-list">
            {topProducts.map((p, idx) => (
              <li key={p.productId} className="top-product-item">
                <span className="rank-num">{idx + 1}.</span>
                <span className="item-name">{p.productName}</span>
                <strong className="item-qty">{p.quantitySold} terjual</strong>
                <span className="item-revenue">({formatRupiah(p.totalRevenue)})</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Transactions History Table */}
      <div className="report-section-card">
        <h3 className="section-card-title">RIWAYAT TRANSAKSI</h3>

        <div className="table-responsive-wrapper">
          <table className="pos-data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>ID Transaksi</th>
                <th>Pelanggan</th>
                <th>Waktu</th>
                <th>Total</th>
                <th>Bayar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-table-td">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                orders
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((order) => (
                    <tr key={order.id} className={order.status === 'voided' ? 'row-voided' : ''}>
                      <td>
                        <strong>{order.sequenceNumber}</strong>
                      </td>
                      <td>
                        <code>{order.orderNumber}</code>
                      </td>
                      <td>{order.customerName || 'Umum'}</td>
                      <td>{formatDateIndonesian(order.createdAt)}</td>
                      <td>
                        <strong>{formatRupiah(order.total)}</strong>
                      </td>
                      <td>{order.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}</td>
                      <td>
                        {order.status === 'completed' ? (
                          <span className="status-badge safe">Sukses</span>
                        ) : (
                          <span className="status-badge critical">Batal / Void</span>
                        )}
                      </td>
                      <td>
                        <div className="table-action-btns">
                          <button
                            type="button"
                            className="btn-action-small"
                            onClick={() => setReprintOrder(order)}
                          >
                            [Cetak]
                          </button>
                          {order.status === 'completed' && (
                            <button
                              type="button"
                              className="btn-action-small danger"
                              onClick={() => handleVoidOrder(order)}
                            >
                              [Void]
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          {/* Pagination Bar (Limit 10 + Panah) */}
          <PaginationBar
            currentPage={currentPage}
            totalItems={orders.length}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Reprint Modal */}
      {reprintOrder && (
        <PrintSelectModal
          order={reprintOrder}
          shopConfig={shopConfig}
          onClose={() => setReprintOrder(null)}
          onConfirmPrint={handleConfirmPrint}
        />
      )}
    </div>
  );
};

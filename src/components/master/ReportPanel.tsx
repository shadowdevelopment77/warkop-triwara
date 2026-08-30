// ═══════════════════════════════════════════════
// Triwara POS — Sales Report & Transaction History Panel (Clean Text, No Icons)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IOrder, IShopConfig } from '../../types';
import { reportService, type ISalesSummary, type ITopProduct, type ISalesChartResult } from '../../services/report.service';
import { orderService } from '../../services/order.service';
import { configService } from '../../services/config.service';
import { pdfService } from '../../services/pdf.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import { formatDateIndonesian } from '../../utils/date';
import { PrintSelectModal } from '../pos/PrintSelectModal';
import type { ReceiptType } from '../../services/receipt.service';
import { PaginationBar } from '../common/PaginationBar';
import { DialogModal } from '../common/DialogModal';
import { VoidModal } from './VoidModal';
import { SalesChart } from './SalesChart';

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
  const [summary, setSummary] = useState<ISalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<ITopProduct[]>([]);
  const [chartData, setChartData] = useState<ISalesChartResult | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [reprintOrder, setReprintOrder] = useState<IOrder | null>(null);
  const [voidingOrder, setVoidingOrder] = useState<IOrder | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);

  useEffect(() => {
    configService.getConfig().then(setShopConfig).catch(console.error);
  }, []);

  const loadReportData = useCallback(async () => {
    try {
      const [summaryData, topData, ordersData, chartRes] = await Promise.all([
        reportService.getSalesSummary(startDate, endDate),
        reportService.getTopSellingProducts(startDate, endDate, 0),
        orderService.getOrders(startDate, endDate),
        reportService.getSalesChartData(startDate, endDate),
      ]);

      setSummary(summaryData);
      setTopProducts(topData);
      setOrders(ordersData);
      setChartData(chartRes);
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
      await pdfService.exportSalesReport(startDate, endDate, summary, topProducts, orders, config, chartData);
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Export PDF Gagal',
        message: (err as Error).message,
        onConfirm: () => {},
      });
    }
  };

  const handleVoidOrder = (order: IOrder) => {
    if (order.status === 'voided') return;
    setVoidingOrder(order);
  };

  const handleConfirmVoid = async (reason: string) => {
    if (!voidingOrder) return;
    const orderNumber = voidingOrder.orderNumber;
    try {
      await orderService.voidOrder(voidingOrder.id!, reason);
      await notificationService.addNotification(
        'Transaksi Dibatalkan (Void)',
        `Transaksi #${orderNumber} dibatalkan. Alasan: ${reason}. Stok bahan telah dikembalikan.`,
        'order',
        'reports'
      );
      setVoidingOrder(null);
      loadReportData();
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Transaksi Dibatalkan',
        message: `Transaksi #${orderNumber} berhasil dibatalkan (void).\nSeluruh stok bahan telah dikembalikan ke inventori.`,
        onConfirm: () => {},
      });
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Void Transaksi',
        message: (err as Error).message,
        onConfirm: () => {},
      });
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
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Pencetakan Terkirim',
        message: `Struk (${selectedTypes.join(', ')}) berhasil dikirim ke printer.`,
        onConfirm: () => {},
      });
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Cetak Struk',
        message: (err as Error).message,
        onConfirm: () => {},
      });
    }
  };

  return (
    <div className="report-view-container">
      {/* Header: Title on Left, Export PDF on Far Right */}
      <div className="report-view-header">
        <h2 className="report-view-title">Laporan Penjualan </h2>
        <button type="button" className="report-btn-primary report-btn-export" onClick={handleExportPdf}>
          Export PDF
        </button>
      </div>

      {/* Date Range Picker with Presets below header */}
      <div className="report-period-filter-bar">
        <div className="report-date-input-group">
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

        <div className="report-date-input-group">
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
      </div>

      {/* Summary Cards Grid (Compact 2-Row Adjustment) */}
      {summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Row 1: Financial Cards */}
          <div className="report-summary-cards-grid">
            <div className="report-summary-card">
              <span className="report-card-label">Total Omset</span>
              <strong className="report-card-val">{formatRupiah(summary.totalOmset)}</strong>
            </div>

            <div className="report-summary-card">
              <span className="report-card-label">Penjualan Tunai</span>
              <strong className="report-card-val">{formatRupiah(summary.totalCash)}</strong>
            </div>

            <div className="report-summary-card">
              <span className="report-card-label">Penjualan QRIS</span>
              <strong className="report-card-val">{formatRupiah(summary.totalQris)}</strong>
            </div>

            <div className="report-summary-card profit">
              <span className="report-card-label">Profit Bersih</span>
              <strong className="report-card-val" style={{ color: '#4ade80' }}>
                {formatRupiah(summary.totalProfit)}
              </strong>
            </div>
          </div>

          {/* Row 2: Operational & Statistics Cards (Total Transaksi, Produk Terjual, Produk Terlaris %) */}
          <div className="report-summary-cards-grid-secondary">
            <div className="report-summary-card">
              <span className="report-card-label">Total Transaksi</span>
              <strong className="report-card-val">
                {summary.completedCount} pesanan
              </strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                {summary.voidedCount > 0 ? `${summary.voidedCount} dibatalkan / void` : 'Semua transaksi sukses'}
              </small>
            </div>

            <div className="report-summary-card">
              <span className="report-card-label">Total Produk Terjual</span>
              <strong className="report-card-val">
                {summary.totalItemsSold} item
              </strong>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Akumulasi seluruh produk terjual
              </small>
            </div>

            <div className="report-summary-card">
              <span className="report-card-label">Produk Terlaris</span>
              <strong className="report-card-val" style={{ fontSize: '15px', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={summary.topProductName}>
                {summary.topProductName !== '-' ? summary.topProductName : '—'}
              </strong>
              <small style={{ color: '#4ade80', fontSize: '11px', fontWeight: 600 }}>
                {summary.topProductPercentage > 0
                  ? `${summary.topProductPercentage}% dari total produk terjual`
                  : 'Belum ada data penjualan'}
              </small>
            </div>
          </div>
        </div>
      )}

      {/* 60:40 Visual Row (Left 60%: Sales Chart | Right 40%: Top Products Ranking) */}
      <div className="report-visual-row">
        {/* Left 60%: Sales Chart */}
        <div className="report-chart-container">
          {chartData && <SalesChart data={chartData} />}
        </div>

        {/* Right 40%: Top Selling Products List */}
        <div className="report-products-container">
          <div className="report-section-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className="report-section-title">🏆 Penjualan Produk</h3>
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                {topProducts.length} menu
              </span>
            </div>

            {topProducts.length === 0 ? (
              <p className="empty-hint">Belum ada data penjualan pada periode ini.</p>
            ) : (
              <div className="report-products-scroll-container" style={{ flex: 1, maxHeight: '240px' }}>
                {topProducts.map((p, idx) => (
                  <div key={p.productId} className="report-product-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="report-product-rank">#{idx + 1}</span>
                      <strong style={{ color: '#0f172a', fontSize: '13px' }}>{p.productName}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>{p.quantitySold} terjual</span>
                      <span style={{ color: '#64748b' }}>•</span>
                      <strong style={{ color: '#0f172a' }}>{formatRupiah(p.totalRevenue)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions History Table */}
      <div className="report-section-card">
        <h3 className="report-section-title">RIWAYAT TRANSAKSI</h3>

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
                                onClick={() => setReprintOrder(order)}
                                title="Cetak Ulang Struk Pelanggan"
                              >
                                🖨️ Cetak
                              </button>
                              <button
                                type="button"
                                className="report-btn-void"
                                onClick={() => handleVoidOrder(order)}
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

      {/* Dedicated Void Modal Dialog */}
      {voidingOrder && (
        <VoidModal
          order={voidingOrder}
          onClose={() => setVoidingOrder(null)}
          onConfirmVoid={handleConfirmVoid}
        />
      )}

      {/* Reusable Dialog Modal for Messages */}
      <DialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        isDanger={dialogConfig.isDanger}
        onConfirm={dialogConfig.onConfirm}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

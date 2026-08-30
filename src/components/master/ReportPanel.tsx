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
import { formatDateIndonesian, formatShortDate } from '../../utils/date';
import { PrintSelectModal } from '../pos/PrintSelectModal';
import type { ReceiptType } from '../../services/receipt.service';
import { PaginationBar } from '../common/PaginationBar';
import { DialogModal } from '../common/DialogModal';
import { VoidModal } from './VoidModal';

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
      const summaryData = await reportService.getSalesSummary(startDate, endDate);
      const topData = await reportService.getTopSellingProducts(startDate, endDate, 0);
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
        <h2 className="report-view-title">Laporan Penjualan &amp; Performa Toko</h2>
        <button type="button" className="report-btn-primary report-btn-export" onClick={handleExportPdf}>
          📄 Export PDF
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

      {/* Summary Cards Grid (OMSET, TUNAI, QRIS, PROFIT) */}
      {summary && (
        <div className="report-summary-cards-grid">
          <div className="report-summary-card">
            <span className="report-card-label">OMSET</span>
            <strong className="report-card-val">{formatRupiah(summary.totalOmset)}</strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
              {summary.completedCount} transaksi sukses, {summary.voidedCount} transaksi dibatalkan
            </small>
          </div>

          <div className="report-summary-card">
            <span className="report-card-label">TUNAI</span>
            <strong className="report-card-val">{formatRupiah(summary.totalCash)}</strong>
          </div>

          <div className="report-summary-card">
            <span className="report-card-label">QRIS</span>
            <strong className="report-card-val">{formatRupiah(summary.totalQris)}</strong>
          </div>

          <div className="report-summary-card profit">
            <span className="report-card-label">PROFIT</span>
            <strong className="report-card-val">{formatRupiah(summary.totalProfit)}</strong>
          </div>
        </div>
      )}

      {/* Product Sales Section (Scrollable box ~5 items visible, responsive) */}
      <div className="report-section-card">
        <h3 className="report-section-title">
          Penjualan Produk pada Periode {formatShortDate(startDate)} - {formatShortDate(endDate)}
        </h3>
        {topProducts.length === 0 ? (
          <p className="empty-hint">Belum ada data penjualan pada periode ini.</p>
        ) : (
          <div className="report-products-scroll-container">
            {topProducts.map((p, idx) => (
              <div key={p.productId} className="report-product-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="report-product-rank">#{idx + 1}</span>
                  <strong style={{ color: '#fafafa', fontSize: '14px' }}>{p.productName}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{p.quantitySold} terjual</span>
                  <span style={{ color: '#52525b' }}>•</span>
                  <strong style={{ color: '#fafafa' }}>{formatRupiah(p.totalRevenue)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions History Table */}
      <div className="report-section-card">
        <h3 className="report-section-title">RIWAYAT TRANSAKSI</h3>

        <div className="report-table-wrapper">
          <table className="report-data-table">
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="report-btn-print"
                            onClick={() => setReprintOrder(order)}
                          >
                            🖨️ Cetak
                          </button>
                          {order.status === 'completed' ? (
                            <button
                              type="button"
                              className="report-btn-void"
                              onClick={() => handleVoidOrder(order)}
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

// ═══════════════════════════════════════════════
// Triwara POS — Sales Report Panel (Pure Executive Analytics)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { reportService, type ISalesSummary, type ITopProduct, type ISalesChartResult } from '../../services/report.service';
import { configService } from '../../services/config.service';
import { pdfService } from '../../services/pdf.service';
import { formatRupiah } from '../../utils/currency';
import { DialogModal } from '../common/DialogModal';
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
  const [pdfProgress, setPdfProgress] = useState<{ isOpen: boolean; percent: number; message: string } | null>(null);

  const loadReportData = useCallback(async () => {
    try {
      const bundle = await reportService.getReportBundle(startDate, endDate);
      setSummary(bundle.summary);
      setTopProducts(bundle.topProducts);
      setChartData(bundle.chart);
    } catch (err) {
      console.error('Failed to load report data:', err);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleSelectPreset = (preset: 'today' | 'month') => {
    setPeriodPreset(preset);
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
    setPdfProgress({ isOpen: true, percent: 5, message: 'Memulai proses export...' });
    try {
      const config = await configService.getConfig();
      await pdfService.exportSalesReport(
        startDate,
        endDate,
        summary,
        topProducts,
        [],
        config,
        chartData,
        (percent, message) => {
          setPdfProgress({ isOpen: true, percent, message });
        }
      );
      setTimeout(() => setPdfProgress(null), 800);
    } catch (err) {
      setPdfProgress(null);
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Gagal Export PDF',
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
        <button
          type="button"
          className={`report-preset-btn ${periodPreset === 'custom' ? 'active' : ''}`}
          onClick={() => setPeriodPreset('custom')}
        >
          Kustom
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
              📄 Mengekspor Laporan PDF
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

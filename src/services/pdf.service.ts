// ═══════════════════════════════════════════════
// Triwara POS — PDF Exporter Service (jsPDF + jsPDF-AutoTable)
// ═══════════════════════════════════════════════

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IOrder, IIngredient, IShopConfig } from '../types';
import type { ISalesSummary, ITopProduct } from './report.service';
import { formatRupiah } from '../utils/currency';
import { formatShortDate, formatDateIndonesian } from '../utils/date';

export class PdfService {
  /**
   * Generates and downloads Sales Report PDF
   */
  async exportSalesReport(
    startDate: Date,
    endDate: Date,
    summary: ISalesSummary,
    topProducts: ITopProduct[],
    orders: IOrder[],
    config: IShopConfig
  ): Promise<void> {
    const doc = new jsPDF();
    const periodStr = `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;

    // 1. Header Title
    doc.setFontSize(18);
    doc.text(config.appName || 'Warkop Triwara', 14, 20);
    doc.setFontSize(12);
    doc.text('Laporan Penjualan & Performa Toko', 14, 28);
    doc.setFontSize(10);
    doc.text(`Periode: ${periodStr}`, 14, 34);

    // 2. Summary Cards Box
    doc.setLineWidth(0.5);
    doc.rect(14, 40, 182, 30);

    doc.setFontSize(9);
    doc.text('TOTAL OMSET', 20, 48);
    doc.setFontSize(12);
    doc.text(formatRupiah(summary.totalOmset), 20, 56);

    doc.setFontSize(9);
    doc.text('PEMBAYARAN TUNAI', 68, 48);
    doc.setFontSize(12);
    doc.text(formatRupiah(summary.totalCash), 68, 56);

    doc.setFontSize(9);
    doc.text('PEMBAYARAN QRIS', 116, 48);
    doc.setFontSize(12);
    doc.text(formatRupiah(summary.totalQris), 116, 56);

    doc.setFontSize(9);
    doc.text('PROFIT BERSIH', 160, 48);
    doc.setFontSize(12);
    doc.text(formatRupiah(summary.totalProfit), 160, 56);

    // 3. Top 5 Best Sellers Table
    doc.setFontSize(12);
    doc.text('5 Produk Terlaris Periode Ini', 14, 80);

    const topTableBody = topProducts.map((p, idx) => [
      idx + 1,
      `[${p.codeBadge}] ${p.productName}`,
      `${p.quantitySold} terjual`,
      formatRupiah(p.totalRevenue),
    ]);

    autoTable(doc, {
      startY: 84,
      head: [['No', 'Produk', 'Jumlah Terjual', 'Total Omset']],
      body: topTableBody,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
    });

    // 4. Transaction History Table (Transaction numbers start from 1)
    const finalY = (doc as any).lastAutoTable.finalY || 130;
    doc.setFontSize(12);
    doc.text('Daftar Riwayat Transaksi', 14, finalY + 12);

    const ordersTableBody = orders.map((o) => [
      o.sequenceNumber,
      o.orderNumber,
      o.customerName || 'Umum',
      formatDateIndonesian(o.createdAt),
      formatRupiah(o.total),
      o.paymentMethod === 'cash' ? 'Tunai' : 'QRIS',
      o.status === 'completed' ? 'Sukses' : 'Batal/Void',
    ]);

    autoTable(doc, {
      startY: finalY + 16,
      head: [['No', 'ID Transaksi', 'Pelanggan', 'Waktu', 'Total', 'Bayar', 'Status']],
      body: ordersTableBody,
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60] },
    });

    doc.save(`Laporan_Penjualan_${periodStr.replace(/\//g, '-')}.pdf`);
  }

  /**
   * Generates and downloads Inventory Stock Report PDF
   */
  async exportInventoryReport(ingredients: IIngredient[], config: IShopConfig): Promise<void> {
    const doc = new jsPDF();
    const todayStr = formatShortDate(new Date());

    doc.setFontSize(18);
    doc.text(config.appName || 'Warkop Triwara', 14, 20);
    doc.setFontSize(12);
    doc.text('Laporan Stok Bahan Baku & Kemasan', 14, 28);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${todayStr}`, 14, 34);

    const tableBody = ingredients.map((ing, idx) => {
      let status = 'Aman';
      if (ing.currentStock <= ing.minStock * 0.1) status = 'Kritis';
      else if (ing.currentStock <= ing.minStock) status = 'Low';

      return [
        idx + 1,
        ing.name,
        ing.category === 'raw' ? 'Bahan Utama' : 'Kemasan',
        `${ing.currentStock} ${ing.unit}`,
        `${ing.minStock} ${ing.unit}`,
        `${formatRupiah(ing.costPerUnit)} / ${ing.unit}`,
        status,
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['No', 'Nama Bahan', 'Kategori', 'Stok Saat Ini', 'Batas Minimal', 'Cost/Unit', 'Status']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
    });

    doc.save(`Laporan_Stok_Bahan_${todayStr.replace(/\//g, '-')}.pdf`);
  }
}

export const pdfService = new PdfService();

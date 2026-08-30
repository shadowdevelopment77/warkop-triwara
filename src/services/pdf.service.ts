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

    // 3. All Product Sales Ranking Table
    doc.setFontSize(12);
    doc.text(`Penjualan Produk`, 14, 80);

    const topTableBody = topProducts.map((p, idx) => [
      `#${idx + 1}`,
      `${p.productName}`,
      `${p.quantitySold} terjual`,
      formatRupiah(p.totalRevenue),
    ]);

    autoTable(doc, {
      startY: 84,
      head: [['Ranking', 'Nama Menu Produk', 'Jumlah Terjual', 'Total Omset']],
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
        `${formatRupiah(ing.costPerUnit)} / ${ing.unit}`,
        status,
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['No', 'Nama Bahan', 'Kategori', 'Stok', 'Cost/Unit', 'Status']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40] },
    });

    doc.save(`Laporan_Stok_Bahan_${todayStr.replace(/\//g, '-')}.pdf`);
  }

  /**
   * Generates and downloads Cashier Shift Report PDF (Paperless & WhatsApp ready)
   */
  async exportShiftReportPdf(
    shift: import('../types').IShift,
    productSales: { productName: string; quantitySold: number }[],
    config: IShopConfig
  ): Promise<void> {
    const doc = new jsPDF();
    const openTimeStr = formatDateIndonesian(shift.openedAt);
    const closeTimeStr = shift.closedAt ? formatDateIndonesian(shift.closedAt) : 'Masih Berjalan';

    // Header
    doc.setFontSize(18);
    doc.text(config.appName || 'Warkop Triwara', 14, 20);
    doc.setFontSize(13);
    doc.text('Laporan Rekap Shift Kasir', 14, 28);
    doc.setFontSize(10);
    doc.text(`Nomor Shift : #${shift.shiftNumber}`, 14, 35);
    doc.text(`Kasir       : ${shift.cashierName}`, 14, 41);
    doc.text(`Waktu Buka  : ${openTimeStr}`, 14, 47);
    doc.text(`Waktu Tutup : ${closeTimeStr}`, 14, 53);

    // Shift Financial Summary
    const expected = shift.expectedEndingCash ?? (shift.startingCash + shift.totalCashSales);
    const actual = shift.actualEndingCash ?? expected;
    const diff = shift.cashDifference ?? (actual - expected);

    const summaryData = [
      ['Kas Awal (Modal Kembalian)', formatRupiah(shift.startingCash)],
      ['Total Penjualan Tunai', formatRupiah(shift.totalCashSales)],
      ['Uang Tunai Sistem (Seharusnya)', formatRupiah(expected)],
      ['Uang Tunai Fisik di Laci', formatRupiah(actual)],
      ['Selisih Kas', `${formatRupiah(diff)} ${diff === 0 ? '(PAS)' : diff > 0 ? '(LEBIH)' : '(KURANG)'}`],
      ['Total Penjualan QRIS (Non-Tunai)', formatRupiah(shift.totalQrisSales)],
      ['Total Omset Shift (Tunai + QRIS)', formatRupiah(shift.totalCashSales + shift.totalQrisSales)],
      ['Total Pesanan Selesai', `${shift.totalTransactions} Pesanan`],
      ['Total Pesanan Dibatalkan (Void)', `${shift.totalVoided} Pesanan`],
    ];

    autoTable(doc, {
      startY: 59,
      head: [['Rincian Kasir & Laci Uang', 'Jumlah']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { halign: 'right', fontStyle: 'bold' },
      },
    });

    let currentY = ((doc as any).lastAutoTable?.finalY || 120) + 12;

    // Product Sales Ranking during Shift
    if (productSales && productSales.length > 0) {
      doc.setFontSize(12);
      doc.text('Ranking Produk Terjual pada Shift Ini', 14, currentY);

      const productsTableBody = productSales.map((p, idx) => [
        `#${idx + 1}`,
        p.productName,
        `${p.quantitySold} terjual`,
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Ranking', 'Nama Produk', 'Jumlah Terjual']],
        body: productsTableBody,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 115 },
          2: { halign: 'right' },
        },
      });

      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 30) + 14;
    }

    if (shift.notes) {
      doc.setFontSize(10);
      doc.text(`Catatan Kasir: ${shift.notes}`, 14, currentY);
    }

    doc.save(`Rekap_Shift_${shift.shiftNumber}_${shift.cashierName}.pdf`);
  }
}

export const pdfService = new PdfService();

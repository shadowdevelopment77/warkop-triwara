// ═══════════════════════════════════════════════
// Triwara POS — PDF Exporter Service (jsPDF + jsPDF-AutoTable)
// ═══════════════════════════════════════════════

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IOrder, IIngredient, IShopConfig } from '../types';
import type { ISalesSummary, ITopProduct, ISalesChartResult } from './report.service';
import { formatRupiah } from '../utils/currency';
import { formatShortDate, formatDateIndonesian } from '../utils/date';
import { db } from '../database/db';

export class PdfService {
  /**
   * Generates and downloads Sales Report PDF:
   * - Page 1: Header, Compact Metric Cards, Vector Omset Chart, and Top Selling Products Table
   * - Page 2+: Transaction History Table (separated cleanly on next page)
   */
  async exportSalesReport(
    startDate: Date,
    endDate: Date,
    summary: ISalesSummary,
    topProducts: ITopProduct[],
    orders: IOrder[],
    config: IShopConfig,
    chartData?: ISalesChartResult | null
  ): Promise<void> {
    const doc = new jsPDF();
    const periodStr = `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;

    // ─── 1. Header Title ───
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(config.appName || 'Warkop Triwara', 14, 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Laporan Penjualan & Performa Toko', 14, 22);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode: ${periodStr}`, 14, 27);
    doc.setTextColor(0, 0, 0);

    // ─── 2. Compact Metric Cards (2 Rows) ───
    // Row 1: Finansial (Y: 31 to 45)
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.3);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(14, 31, 182, 14, 1, 1, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL OMSET', 18, 36);
    doc.text('PENJUALAN TUNAI', 64, 36);
    doc.text('PENJUALAN QRIS', 110, 36);
    doc.text('PROFIT BERSIH', 156, 36);

    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    doc.text(formatRupiah(summary.totalOmset), 18, 42);
    doc.text(formatRupiah(summary.totalCash), 64, 42);
    doc.text(formatRupiah(summary.totalQris), 110, 42);
    doc.setTextColor(22, 163, 74);
    doc.text(formatRupiah(summary.totalProfit), 156, 42);

    // Row 2: Operational & Performa (Y: 47 to 61)
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(14, 47, 182, 14, 1, 1, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL TRANSAKSI', 18, 52);
    doc.text('TOTAL PRODUK TERJUAL', 76, 52);
    doc.text('PRODUK TERLARIS', 134, 52);

    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    doc.text(`${summary.completedCount} pesanan`, 18, 58);
    doc.text(`${summary.totalItemsSold} item`, 76, 58);

    const topDisplay =
      summary.topProductName !== '-'
        ? `${summary.topProductName} (${summary.topProductPercentage}%)`
        : '—';
    doc.setTextColor(37, 99, 235);
    doc.text(topDisplay.length > 28 ? topDisplay.slice(0, 26) + '...' : topDisplay, 134, 58);
    doc.setTextColor(0, 0, 0);

    // ─── 3. Visual Vector Bar Chart (Y: 65 to 110) ───
    let currentY = 65;
    if (chartData && chartData.points.length > 0) {
      doc.setFillColor(248, 248, 250);
      doc.roundedRect(14, currentY, 182, 44, 1.5, 1.5, 'F');
      doc.rect(14, currentY, 182, 44, 'S');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`Grafik Tren Omset Penjualan (${chartData.modeLabel})`, 18, currentY + 6);

      if (chartData.peakPoint && chartData.peakPoint.omset > 0) {
        doc.setFontSize(7.5);
        doc.setTextColor(22, 163, 74);
        doc.text(
          `Teramai: ${chartData.peakPoint.label} (${formatRupiah(chartData.peakPoint.omset)})`,
          190,
          currentY + 6,
          { align: 'right' }
        );
      }

      // Draw Vector Line Chart
      const chartBaseY = currentY + 36;
      const chartDrawH = 24;
      const chartLeftX = 22;
      const chartAvailW = 166;
      const pts = chartData.points;
      const maxVal = Math.max(1, ...pts.map((p) => p.omset));
      const stepX = pts.length > 1 ? chartAvailW / (pts.length - 1) : chartAvailW / 2;

      // Baseline
      doc.setDrawColor(200, 200, 205);
      doc.setLineWidth(0.3);
      doc.line(chartLeftX, chartBaseY, chartLeftX + chartAvailW, chartBaseY);

      // Compute coordinate points
      const coords = pts.map((pt, i) => {
        const x = chartLeftX + (pts.length > 1 ? i * stepX : chartAvailW / 2);
        const y = chartBaseY - (pt.omset / maxVal) * chartDrawH;
        return { x, y, pt, i };
      });

      // Draw line segments connecting points
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.8);
      for (let i = 0; i < coords.length - 1; i++) {
        doc.line(coords[i].x, coords[i].y, coords[i + 1].x, coords[i + 1].y);
      }

      // Draw data point circles & X-axis labels
      coords.forEach(({ x, y, pt, i }) => {
        if (pt.isPeak) {
          doc.setFillColor(34, 197, 94);
          doc.circle(x, y, 1.4, 'F');
        } else if (pt.omset > 0) {
          doc.setFillColor(59, 130, 246);
          doc.circle(x, y, 0.9, 'F');
        }

        const showLabel =
          chartData.mode === 'hourly'
            ? i % 4 === 0 || i === 23
            : true;

        if (showLabel) {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(120, 120, 120);
          doc.text(pt.label, x, chartBaseY + 4, { align: 'center' });
        }
      });

      currentY += 48;
    }

    // ─── 4. Top Selling Products Table (Page 1) ───
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('Penjualan Produk', 14, currentY + 4);

    const topTableBody = topProducts.map((p, idx) => [
      `#${idx + 1}`,
      `${p.productName}`,
      `${p.quantitySold} terjual`,
      formatRupiah(p.totalRevenue),
    ]);

    autoTable(doc, {
      startY: currentY + 7,
      head: [['Ranking', 'Nama Menu Produk', 'Jumlah Terjual', 'Total Omset']],
      body: topTableBody.length > 0 ? topTableBody : [['-', 'Belum ada data', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 },
    });

    // ─── 5. Transaction History Table (Cleanly on Page 2+) ───
    doc.addPage();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(config.appName || 'Warkop Triwara', 14, 18);
    doc.setFontSize(11);
    doc.text('Daftar Riwayat Transaksi', 14, 25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode: ${periodStr}`, 14, 30);
    doc.setTextColor(0, 0, 0);

    const ordersTableBody = orders.map((o) => [
      o.sequenceNumber,
      o.orderNumber,
      o.processedBy || 'Kasir',
      o.customerName || 'Umum',
      formatDateIndonesian(o.createdAt),
      formatRupiah(o.total),
      o.paymentMethod === 'cash' ? 'Tunai' : 'QRIS',
      o.status === 'completed' ? 'Sukses' : 'Batal/Void',
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['No', 'ID Transaksi', 'Kasir', 'Pelanggan', 'Waktu', 'Total', 'Bayar', 'Status']],
      body: ordersTableBody.length > 0 ? ordersTableBody : [['-', '-', '-', '-', '-', '-', '-', 'Tidak ada data']],
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });

    // Check for operational expenses (petty cash) in closed shifts during period
    try {
      const shifts = await db.shifts
        .where('openedAt')
        .between(startDate, endDate, true, true)
        .toArray();

      const allExpenses: { date: Date; shiftNo: string; cashier: string; desc: string; amount: number }[] = [];
      shifts.forEach((s) => {
        if (s.expenses && s.expenses.length > 0) {
          s.expenses.forEach((e) => {
            allExpenses.push({
              date: s.openedAt,
              shiftNo: s.shiftNumber,
              cashier: s.cashierName,
              desc: e.description,
              amount: e.amount,
            });
          });
        }
      });

      if (allExpenses.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Rincian Pembelian / Pengeluaran Operasional (Petty Cash)', 14, 18);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const totalExp = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        doc.text(`Periode: ${periodStr} | Total Pengeluaran: ${formatRupiah(totalExp)}`, 14, 24);
        doc.setTextColor(0, 0, 0);

        const expenseTableBody: any[] = allExpenses.map((e, idx) => [
          idx + 1,
          formatShortDate(e.date),
          `#${e.shiftNo}`,
          e.cashier,
          e.desc,
          formatRupiah(e.amount),
        ]);
        expenseTableBody.push(['', '', '', '', 'TOTAL PEMBELIAN OPERASIONAL', formatRupiah(totalExp)]);

        autoTable(doc, {
          startY: 28,
          head: [['No', 'Tanggal', 'Shift', 'Kasir', 'Keterangan Barang / Keperluan', 'Nominal']],
          body: expenseTableBody,
          theme: 'grid',
          headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 26 },
            3: { cellWidth: 26 },
            4: { cellWidth: 65 },
            5: { halign: 'right', fontStyle: 'bold' },
          },
        });
      }
    } catch (err) {
      console.warn('Could not load shift expenses for sales report PDF:', err);
    }

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
   * Generates and downloads Cashier Shift Report PDF (Paperless financial reconciliation)
   */
  async exportShiftReportPdf(
    shift: import('../types').IShift,
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
    const expected = shift.expectedEndingCash ?? (shift.startingCash + shift.totalCashSales - (shift.totalExpenses || 0));
    const actual = shift.actualEndingCash ?? expected;
    const diff = shift.cashDifference ?? (actual - expected);

    const summaryData = [
      ['Kas Awal (Modal Kembalian)', formatRupiah(shift.startingCash)],
      ['Total Penjualan Tunai', formatRupiah(shift.totalCashSales)],
    ];

    if (shift.totalExpenses && shift.totalExpenses > 0) {
      summaryData.push(['Total Belanja / Pengeluaran Kasir', `-${formatRupiah(shift.totalExpenses)}`]);
      if (shift.borrowedFromSales && shift.borrowedFromSales > 0) {
        summaryData.push(['  *(Peringatan: Pinjam Uang Sales)', formatRupiah(shift.borrowedFromSales)]);
      }
    }

    summaryData.push(
      ['Uang Tunai Sistem (Seharusnya)', formatRupiah(expected)],
      ['Uang Tunai Fisik di Laci', formatRupiah(actual)],
      ['Selisih Kas', `${formatRupiah(diff)} ${diff === 0 ? '(PAS)' : diff > 0 ? '(LEBIH)' : '(KURANG)'}`],
      ['Total Penjualan QRIS (Non-Tunai)', formatRupiah(shift.totalQrisSales)],
      ['Total Omset Shift (Tunai + QRIS)', formatRupiah(shift.totalCashSales + shift.totalQrisSales)],
      ['Total Pesanan Selesai', `${shift.totalTransactions} Pesanan`],
      ['Total Pesanan Dibatalkan (Void)', `${shift.totalVoided} Pesanan`]
    );

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

    let currentY = ((doc as any).lastAutoTable?.finalY || 120) + 10;

    // Detailed Expenses Table if cashier recorded purchases
    if (shift.expenses && shift.expenses.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Rincian Pembelian / Pengeluaran Kasir (Petty Cash):', 14, currentY);
      currentY += 4;

      const expenseRows: any[] = shift.expenses.map((e, idx) => [
        idx + 1,
        e.description,
        formatRupiah(e.amount),
      ]);
      expenseRows.push(['', 'TOTAL PENGELUARAN', formatRupiah(shift.totalExpenses || 0)]);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Keterangan Barang / Keperluan', 'Nominal']],
        body: expenseRows,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 120 },
          2: { halign: 'right', fontStyle: 'bold' },
        },
      });

      currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;
    }

    if (shift.notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Catatan Kasir: ${shift.notes}`, 14, currentY);
    }

    doc.save(`Rekap_Shift_${shift.shiftNumber}_${shift.cashierName}.pdf`);
  }
}

export const pdfService = new PdfService();

// ═══════════════════════════════════════════════
// Triwara POS — Excel / CSV Export Utility (UTF-8 BOM for Microsoft Excel)
// ═══════════════════════════════════════════════

import type { IOrder } from '../types';
import { formatDateIndonesian } from './date';

/**
 * Escapes a cell value for CSV/Excel format
 */
const escapeCsvCell = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Builds CSV string with UTF-8 BOM from list of orders
 */
export const buildOrdersCsvContent = (orders: IOrder[]): string => {
  const headers = [
    'No',
    'No Pesanan',
    'Nomor Urut',
    'Kasir',
    'Nama Pelanggan',
    'Waktu Transaksi',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'Pajak (Rp)',
    'Total (Rp)',
    'Metode Pembayaran',
    'Nominal Bayar (Rp)',
    'Kembalian (Rp)',
    'Status',
    'Alasan Batal (Void)',
    'Rincian Item',
  ];

  const rows = orders.map((o, idx) => {
    const itemsSummary = o.items
      ? o.items
          .map((i) => {
            const addStr = i.toppings && i.toppings.length > 0 ? ` +(${i.toppings.map((a) => a.name).join(', ')})` : '';
            return `${i.productName} x${i.qty}${addStr}`;
          })
          .join('; ')
      : '-';

    return [
      idx + 1,
      o.orderNumber,
      o.sequenceNumber,
      o.processedBy || 'Kasir',
      o.customerName || 'Umum',
      formatDateIndonesian(o.createdAt),
      o.subtotal || o.total,
      o.discountAmount || 0,
      0, // Pajak
      o.total,
      o.paymentMethod === 'cash' ? 'Tunai' : 'QRIS',
      o.paymentAmount || o.total,
      o.changeAmount || 0,
      o.status === 'completed' ? 'Sukses' : 'Dibatalkan/Void',
      o.voidReason || '-',
      itemsSummary,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
};

/**
 * Exports a list of orders to an Excel-compatible CSV file with UTF-8 BOM
 */
export const exportOrdersToExcel = (orders: IOrder[], filename: string): void => {
  const csvContent = buildOrdersCsvContent(orders);

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

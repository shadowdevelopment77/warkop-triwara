// ═══════════════════════════════════════════════
// Triwara POS — Excel / CSV Export Utility (UTF-8 BOM for Microsoft Excel)
// ═══════════════════════════════════════════════

import type { IOrder } from '../types';
import { formatDateIndonesian } from './date';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { NativeStorage } from '../services/backup.service';

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
            const qty = i.qty ?? (i as unknown as { quantity?: number }).quantity ?? 1;
            const addStr = i.toppings && i.toppings.length > 0 ? ` +(${i.toppings.map((a) => a.name).join(', ')})` : '';
            return `${i.productName} x${qty}${addStr}`;
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
 * Exports a list of orders to an Excel-compatible CSV file with UTF-8 BOM.
 * 
 * Multi-Platform support:
 * 1. Native Android (Capacitor):
 *    - Saves directly to the public Download folder using NativeStorage plugin
 *    - Saves to app Documents folder via Filesystem plugin
 *    - Opens native Share dialog so user can open in Excel/Sheets or send via WhatsApp/Drive
 * 2. Web / Browser:
 *    - Uses Blob URL + <a download> click
 */
export const exportOrdersToExcel = async (orders: IOrder[], filename: string): Promise<void> => {
  const csvContent = buildOrdersCsvContent(orders);
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  if (Capacitor.isNativePlatform()) {
    // 1. Save directly into device's public Download folder (accessible via file manager)
    try {
      await NativeStorage.saveToDownloads({
        fileName: finalFilename,
        content: csvContent,
        mimeType: 'text/csv',
      });
    } catch (nativeErr) {
      console.warn('NativeStorage saveToDownloads fallback to Filesystem:', nativeErr);
    }

    // 2. Write to Documents and trigger Android Share sheet
    try {
      const written = await Filesystem.writeFile({
        path: finalFilename,
        data: csvContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });

      try {
        await Share.share({
          title: finalFilename,
          url: written.uri,
        });
      } catch {
        // User may dismiss the share dialog — file is already safely persisted
      }
    } catch (fsErr) {
      console.warn('Filesystem / Share error:', fsErr);
    }
    return;
  }

  // Web fallback
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

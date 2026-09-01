// ═══════════════════════════════════════════════
// Triwara POS — ESC/POS Thermal Receipt Generator Service (3 Types)
// ═══════════════════════════════════════════════

import type { IOrder, IShopConfig } from '../types';
import { formatDateIndonesian } from '../utils/date';
import { formatRupiah } from '../utils/currency';

export type ReceiptType = 'customer' | 'bar' | 'kitchen';

export class ReceiptService {
  private LINE_WIDTH = 32; // 58mm printer = 32 characters per line

  /** Centers text within 32 character line width */
  private centerLine(text: string): string {
    if (text.length >= this.LINE_WIDTH) return text.substring(0, this.LINE_WIDTH);
    const leftPadding = Math.floor((this.LINE_WIDTH - text.length) / 2);
    return ' '.repeat(leftPadding) + text;
  }

  /** Formats key-value pairs aligned to left and right margins */
  private formatKeyValue(left: string, right: string): string {
    const spaceCount = this.LINE_WIDTH - (left.length + right.length);
    if (spaceCount <= 0) {
      return left.substring(0, this.LINE_WIDTH - right.length) + right;
    }
    return left + ' '.repeat(spaceCount) + right;
  }

  /** Horizontal separator line */
  private lineDivider(char: string = '-'): string {
    return char.repeat(this.LINE_WIDTH);
  }

  /** Wraps long detail/note text so lines strictly do not exceed 32 characters */
  private wrapIndent(text: string, maxLen: number = 30, indent: string = '  '): string[] {
    if (text.length <= maxLen) return [indent + text];
    const words = text.split(' ');
    const result: string[] = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? current + ' ' + w : w;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        if (current) result.push(indent + current);
        current = w;
      }
    }
    if (current) result.push(indent + current);
    return result;
  }

  /**
   * Generates formatted text receipt for 58mm thermal printer (BT-58D)
   */
  generateReceiptText(order: IOrder, config: IShopConfig, type: ReceiptType): string {
    const lines: string[] = [];

    if (type === 'customer') {
      // ════════════ CUSTOMER RECEIPT ════════════
      lines.push(this.lineDivider('='));
      config.receiptHeaderLines.forEach((header) => {
        if (header.trim()) lines.push(this.centerLine(header.trim()));
      });
      lines.push(this.lineDivider('='));
      lines.push(`No  : ${order.orderNumber}`);
      lines.push(`Tgl : ${formatDateIndonesian(order.createdAt)}`);
      lines.push(`Pel : ${order.customerName}`);
      lines.push(this.lineDivider('='));

      order.items.forEach((item) => {
        const itemHeader = `${item.productName}`;
        const qtyStr = `x${item.qty}`;
        const priceStr = formatRupiah(item.subtotal);

        lines.push(this.formatKeyValue(itemHeader.substring(0, 16), `${qtyStr} ${priceStr}`));

        const details: string[] = [];
        details.push(item.orderType === 'takeaway' ? 'Takeaway' : 'Dine In');
        if (item.temperature) details.push(item.temperature);
        if (item.sugarLevel) details.push(item.sugarLevel);
        item.toppings.forEach((t) => {
          details.push(`+${t.name}${t.price ? ` (${formatRupiah(t.price)})` : ''}`);
        });

        if (details.length > 0) {
          this.wrapIndent(`(${details.join(', ')})`).forEach((dl) => lines.push(dl));
        }
        if (item.notes) {
          this.wrapIndent(`* ${item.notes}`).forEach((nl) => lines.push(nl));
        }
      });

      lines.push(this.lineDivider('-'));
      lines.push(this.formatKeyValue('Subtotal:', formatRupiah(order.subtotal)));
      if (order.discountPercent > 0) {
        lines.push(this.formatKeyValue(`Diskon (${order.discountPercent}%):`, `-${formatRupiah(order.discountAmount)}`));
      }
      lines.push(this.lineDivider('-'));
      lines.push(this.formatKeyValue('TOTAL:', formatRupiah(order.total)));
      lines.push(
        this.formatKeyValue(
          `Bayar (${order.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}):`,
          formatRupiah(order.paymentAmount)
        )
      );
      if (order.paymentMethod === 'cash') {
        lines.push(this.formatKeyValue('Kembali:', formatRupiah(order.changeAmount)));
      }
      lines.push(this.lineDivider('='));

      config.receiptFooterLines.forEach((footer) => {
        if (footer.trim()) lines.push(this.centerLine(footer.trim()));
      });
      lines.push(this.lineDivider('='));
    } else if (type === 'bar') {
      // ════════════ BAR RECEIPT ════════════
      lines.push(this.lineDivider('='));
      lines.push(this.centerLine(`ORDER BAR — #${order.orderNumber}`));
      lines.push(this.centerLine(formatDateIndonesian(order.createdAt)));
      lines.push(`Pelanggan: ${order.customerName}`);
      lines.push(this.lineDivider('='));

      order.items.forEach((item) => {
        lines.push(this.formatKeyValue(item.productName.substring(0, 18), `x${item.qty} ${formatRupiah(item.subtotal)}`));

        const details: string[] = [];
        details.push(item.orderType === 'takeaway' ? 'Takeaway' : 'Dine In');
        if (item.temperature) details.push(item.temperature);
        if (item.sugarLevel) details.push(item.sugarLevel);
        item.toppings.forEach((t) => details.push(`+${t.name}`));

        if (details.length > 0) {
          this.wrapIndent(`(${details.join(', ')})`).forEach((dl) => lines.push(dl));
        }
        if (item.notes) {
          this.wrapIndent(`* ${item.notes}`).forEach((nl) => lines.push(nl));
        }
      });

      lines.push(this.lineDivider('-'));
      lines.push(this.formatKeyValue('TOTAL BAR:', formatRupiah(order.total)));
      lines.push(this.lineDivider('='));
    } else if (type === 'kitchen') {
      // ════════════ KITCHEN RECEIPT (NO PRICES) ════════════
      lines.push(this.lineDivider('='));
      lines.push(this.centerLine(`ORDER DAPUR — #${order.orderNumber}`));
      lines.push(this.centerLine(formatDateIndonesian(order.createdAt)));
      lines.push(`Pelanggan: ${order.customerName}`);
      lines.push(this.lineDivider('='));

      order.items.forEach((item) => {
        lines.push(this.formatKeyValue(item.productName.substring(0, 24), `x${item.qty}`));

        const details: string[] = [];
        details.push(item.orderType === 'takeaway' ? 'Takeaway' : 'Dine In');
        if (item.temperature) details.push(item.temperature);
        if (item.sugarLevel) details.push(item.sugarLevel);
        item.toppings.forEach((t) => details.push(`+${t.name}`));

        if (details.length > 0) {
          this.wrapIndent(`(${details.join(', ')})`).forEach((dl) => lines.push(dl));
        }
        if (item.notes) {
          this.wrapIndent(`* ${item.notes}`).forEach((nl) => lines.push(nl));
        }
      });

      lines.push(this.lineDivider('='));
    }

    // Add extra line feeds for paper tearing
    lines.push('\n\n\n');
    return lines.join('\n');
  }

  /**
   * Generates formatted text receipt for Cashier Shift Summary (58mm thermal)
   */
  generateShiftReceiptText(shift: import('../types').IShift, config: IShopConfig): string {
    const lines: string[] = [];
    const expected = shift.expectedEndingCash ?? (shift.startingCash + shift.totalCashSales - (shift.totalExpenses || 0));
    const actual = shift.actualEndingCash ?? expected;
    const diff = shift.cashDifference ?? (actual - expected);

    lines.push(this.lineDivider('='));
    lines.push(this.centerLine(config.appName || 'WARKOP TRIWARA'));
    lines.push(this.centerLine('REKAP SHIFT KASIR'));
    lines.push(this.lineDivider('='));
    lines.push(`No Shift : #${shift.shiftNumber}`);
    lines.push(`Kasir    : ${shift.cashierName}`);
    lines.push(`Buka     : ${formatDateIndonesian(shift.openedAt)}`);
    if (shift.closedAt) {
      lines.push(`Tutup    : ${formatDateIndonesian(shift.closedAt)}`);
    }
    lines.push(this.lineDivider('-'));
    lines.push(this.formatKeyValue('Kas Awal Modal', formatRupiah(shift.startingCash)));
    lines.push(this.formatKeyValue('+ Total Tunai', formatRupiah(shift.totalCashSales)));
    if (shift.totalExpenses && shift.totalExpenses > 0) {
      lines.push(this.formatKeyValue('- Pengeluaran Kas', `-${formatRupiah(shift.totalExpenses)}`));
      if (shift.borrowedFromSales && shift.borrowedFromSales > 0) {
        lines.push(`  *(Pinjam Sales: ${formatRupiah(shift.borrowedFromSales)})`);
      }
    }
    lines.push(this.lineDivider('-'));
    lines.push(this.formatKeyValue('Uang Tunai Laci', formatRupiah(expected)));
    lines.push(this.formatKeyValue('Fisik Dihitung', formatRupiah(actual)));
    lines.push(this.formatKeyValue('Selisih Kas', `${formatRupiah(diff)} ${diff === 0 ? '(PAS)' : diff > 0 ? '(+)' : '(-)'}`));

    if (shift.expenses && shift.expenses.length > 0) {
      lines.push(this.lineDivider('-'));
      lines.push(this.centerLine('RINCIAN BELANJA KASIR:'));
      shift.expenses.forEach((exp, idx) => {
        lines.push(this.formatKeyValue(`${idx + 1}. ${exp.description.substring(0, 16)}`, formatRupiah(exp.amount)));
      });
      lines.push(this.formatKeyValue('Total Belanja:', formatRupiah(shift.totalExpenses || 0)));
    }

    lines.push(this.lineDivider('-'));
    lines.push(this.formatKeyValue('Penjualan QRIS', formatRupiah(shift.totalQrisSales)));
    lines.push(this.formatKeyValue('Total Omset', formatRupiah(shift.totalCashSales + shift.totalQrisSales)));
    lines.push(this.formatKeyValue('Pesanan Sukses', `${shift.totalTransactions} Order`));
    lines.push(this.formatKeyValue('Pesanan Void', `${shift.totalVoided} Order`));
    lines.push(this.lineDivider('='));
    lines.push(this.centerLine('Tanda Tangan Kasir,'));
    lines.push('\n\n');
    lines.push(this.centerLine(`( ${shift.cashierName} )`));
    lines.push(this.lineDivider('='));
    lines.push('\n\n\n');

    return lines.join('\n');
  }

  /**
   * Generates a 58mm test print receipt to verify printer connectivity and paper feed
   */
  generateTestReceiptText(config: IShopConfig): string {
    const lines: string[] = [];
    lines.push(this.lineDivider('='));
    lines.push(this.centerLine(config.appName || 'WARKOP TRIWARA'));
    lines.push(this.centerLine('UJI CETAK THERMAL 58MM'));
    lines.push(this.lineDivider('='));
    lines.push(`Printer : ${config.printerName || 'Xantri BT-58D'}`);
    if (config.printerMacAddress) {
      lines.push(`MAC     : ${config.printerMacAddress}`);
    }
    lines.push(`Waktu   : ${formatDateIndonesian(new Date())}`);
    lines.push(`Lebar   : 58mm (32 Karakter)`);
    lines.push(this.lineDivider('-'));
    lines.push(this.centerLine('STATUS: KONEKSI BERHASIL!'));
    lines.push(this.centerLine('Printer siap digunakan kasir.'));
    lines.push(this.lineDivider('='));
    lines.push('\n\n\n');
    return lines.join('\n');
  }

  /**
   * Converts a receipt string into standard ESC/POS binary command buffer
   * Configured for 58mm thermal paper (print area = 384 dots @ 203 DPI)
   */
  convertToEscPosBuffer(receiptText: string): Uint8Array {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(receiptText);

    // ESC @ — Initialize printer (clears previous settings)
    const initCmd = new Uint8Array([0x1b, 0x40]);

    // GS L 0 0 — Set left margin = 0
    const setLeftMargin = new Uint8Array([0x1d, 0x4c, 0x00, 0x00]);

    // GS W 384 — Set print area width = 384 dots (58mm @ 203 DPI standard)
    // 384 decimal = 0x0180 → nL = 0x80, nH = 0x01
    const setPaperWidth = new Uint8Array([0x1d, 0x57, 0x80, 0x01]);

    // ESC M 0 — Select Font A (standard readable size for 32 chars/line on 58mm)
    const setFontA = new Uint8Array([0x1b, 0x4d, 0x00]);

    // ESC d 4 — Feed 4 lines (enough to push past cutter blade before cut)
    const feedCmd = new Uint8Array([0x1b, 0x64, 0x04]);

    // GS V 66 0 — Partial paper cut
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

    const totalLength =
      initCmd.length +
      setLeftMargin.length +
      setPaperWidth.length +
      setFontA.length +
      textBytes.length +
      feedCmd.length +
      cutCmd.length;

    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    buffer.set(initCmd, offset);       offset += initCmd.length;
    buffer.set(setLeftMargin, offset); offset += setLeftMargin.length;
    buffer.set(setPaperWidth, offset); offset += setPaperWidth.length;
    buffer.set(setFontA, offset);      offset += setFontA.length;
    buffer.set(textBytes, offset);     offset += textBytes.length;
    buffer.set(feedCmd, offset);       offset += feedCmd.length;
    buffer.set(cutCmd, offset);

    return buffer;
  }
}

export const receiptService = new ReceiptService();

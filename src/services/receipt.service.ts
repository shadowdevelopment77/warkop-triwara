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

        if (item.orderType === 'takeaway') {
          lines.push('  + Takeaway');
        }
        item.toppings.forEach((t) => {
          lines.push(`  + ${t.name}`);
        });
        if (item.notes) {
          lines.push(`  * ${item.notes}`);
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
        if (item.orderType === 'takeaway') {
          lines.push('  + Takeaway');
        }
        item.toppings.forEach((t) => lines.push(`  + ${t.name}`));
        if (item.notes) lines.push(`  * ${item.notes}`);
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
        if (item.orderType === 'takeaway') {
          lines.push('  + Takeaway');
        }
        item.toppings.forEach((t) => lines.push(`  + ${t.name}`));
        if (item.notes) lines.push(`  * ${item.notes}`);
      });

      lines.push(this.lineDivider('='));
    }

    // Add extra line feeds for paper tearing
    lines.push('\n\n\n');
    return lines.join('\n');
  }
}

export const receiptService = new ReceiptService();

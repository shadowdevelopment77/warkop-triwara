import { describe, it, expect, beforeEach } from 'vitest';
import { printerService } from '../services/printer.service';
import { receiptService } from '../services/receipt.service';
import type { IOrder, IShift, IShopConfig } from '../types';

describe('Thermal Printer Service & ESC/POS Formatting Tests', () => {
  const sampleConfig: IShopConfig = {
    appName: 'Warkop Triwara',
    receiptHeaderLines: ['Warkop Triwara Coffee', 'Jl. Sunset Road No. 88, Bali'],
    receiptFooterLines: ['Terima Kasih', 'WiFi: Triwara | Pass: kopi123'],
    printerName: 'Xantri Thermal BT-58D',
    printerMacAddress: '00:11:22:33:44:55',
    pinHash: 'dummyhash',
  };

  const sampleOrder: IOrder = {
    id: 1,
    orderNumber: 'TRW-20260901-001',
    sequenceNumber: 1,
    customerName: 'Ahmad Wijaya',
    items: [
      {
        productId: 10,
        productName: 'Kopi Susu Aren',
        price: 18000,
        hpp: 6000,
        hppSubtotal: 6000,
        qty: 2,
        orderType: 'dine_in',
        temperature: 'Iced',
        sugarLevel: 'Less Sugar',
        toppings: [{ name: 'Espresso Shot', price: 4000, hppCost: 1500 }],
        notes: 'Jangan terlalu manis',
        subtotal: 44000,
      },
      {
        productId: 20,
        productName: 'Roti Bakar Keju',
        price: 15000,
        hpp: 5000,
        hppSubtotal: 5000,
        qty: 1,
        orderType: 'takeaway',
        toppings: [],
        notes: 'Potong kecil',
        subtotal: 15000,
      },
    ],
    subtotal: 59000,
    discountPercent: 0,
    discountAmount: 0,
    total: 59000,
    paymentMethod: 'cash',
    paymentAmount: 100000,
    changeAmount: 41000,
    status: 'completed',
    hppTotal: 17000,
    profit: 42000,
    createdAt: new Date('2026-09-01T10:30:00.000Z'),
  };

  const sampleShift: IShift = {
    id: 1,
    shiftNumber: 'SHF-20260901-001',
    cashierId: 2,
    cashierName: 'Budi (Kasir)',
    startingCash: 100000,
    totalCashSales: 150000,
    totalQrisSales: 200000,
    totalTransactions: 10,
    cashTransactions: 5,
    qrisTransactions: 5,
    totalVoided: 0,
    totalExpenses: 25000,
    expectedEndingCash: 225000,
    actualEndingCash: 225000,
    cashDifference: 0,
    expenses: [{ id: 'exp-1', description: 'Beli Es Batu 2 Bal', amount: 25000 }],
    status: 'closed',
    openedAt: new Date('2026-09-01T08:00:00.000Z'),
    closedAt: new Date('2026-09-01T16:00:00.000Z'),
  };

  beforeEach(() => {
    printerService.setMockErrorCode(null);
  });

  it('rejects printing if printer is not configured (Pre-flight check)', async () => {
    const unconfiguredConfig: IShopConfig = {
      ...sampleConfig,
      printerMacAddress: undefined,
    };

    const res = await printerService.printReceipt(sampleOrder, 'customer', unconfiguredConfig);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('PRINTER_NOT_CONFIGURED');
    expect(res.error).toContain('Printer thermal belum tersambung');
  });

  it('enforces zero-queue fail-fast policy when communication fails', async () => {
    printerService.setMockErrorCode('CONNECTION_LOST');

    const res = await printerService.printReceipt(sampleOrder, 'customer', sampleConfig);
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('CONNECTION_LOST');
    expect(res.error).toContain('Koneksi printer terputus');

    // Next print request succeeds without queued ghost prints
    const retryRes = await printerService.printReceipt(sampleOrder, 'customer', sampleConfig);
    expect(retryRes.success).toBe(true);
    expect(retryRes.bytesSent).toBeGreaterThan(0);
  });

  it('generates customer receipt with 32-character line limits and store details', () => {
    const text = receiptService.generateReceiptText(sampleOrder, sampleConfig, 'customer');

    expect(text).toContain('Warkop Triwara Coffee');
    expect(text).toContain('TRW-20260901-001');
    expect(text).toContain('Ahmad Wijaya');
    expect(text).toContain('TOTAL:');
    expect(text).toMatch(/Rp[\s\u00A0]*59\.000/);
    expect(text).toContain('Kembali:');
    expect(text).toMatch(/Rp[\s\u00A0]*41\.000/);
    expect(text).toContain('Terima Kasih');

    // Verify line width constraint (<= 32 characters per line, ignoring newline feeds)
    const lines = text.split('\n');
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(32);
    }
  });

  it('generates bar receipt with items, toppings, item prices and TOTAL BAR without store branding', () => {
    const text = receiptService.generateReceiptText(sampleOrder, sampleConfig, 'bar');

    expect(text).toContain('ORDER BAR — #TRW-20260901-001');
    expect(text).toContain('Kopi Susu Aren');
    expect(text).toMatch(/Rp[\s\u00A0]*44\.000/);
    expect(text).toContain('+Espresso Shot');
    expect(text).toContain('TOTAL BAR:');
    expect(text).toMatch(/Rp[\s\u00A0]*59\.000/);

    // Must NOT contain customer receipt headers or footers
    expect(text).not.toContain('Warkop Triwara Coffee');
    expect(text).not.toContain('Kembali:');
    expect(text).not.toContain('WiFi: Triwara');

    const lines = text.split('\n');
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(32);
    }
  });

  it('generates kitchen receipt with items, notes, and strictly ZERO prices', () => {
    const text = receiptService.generateReceiptText(sampleOrder, sampleConfig, 'kitchen');

    expect(text).toContain('ORDER DAPUR — #TRW-20260901-001');
    expect(text).toContain('Roti Bakar Keju');
    expect(text).toContain('x1');
    expect(text).toContain('Potong kecil');

    // Must NOT contain any price references
    expect(text).not.toContain('Rp');
    expect(text).not.toContain('TOTAL');
    expect(text).not.toContain('Subtotal');

    const lines = text.split('\n');
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(32);
    }
  });

  it('generates shift closing receipt and converts to binary ESC/POS buffer with paper cut command', async () => {
    const text = receiptService.generateShiftReceiptText(sampleShift, sampleConfig);

    expect(text).toContain('REKAP SHIFT KASIR');
    expect(text).toContain('Budi (Kasir)');
    expect(text).toContain('Kas Awal Modal');
    expect(text).toContain('Uang Tunai Laci');
    expect(text).toContain('Beli Es Batu');
    expect(text).toContain('(PAS)');

    // Convert to ESC/POS binary buffer
    const buffer = receiptService.convertToEscPosBuffer(text);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(text.length);

    // Verify ESC @ (0x1B, 0x40) at start
    expect(buffer[0]).toBe(0x1b);
    expect(buffer[1]).toBe(0x40);

    // Verify GS V 66 0 (0x1D, 0x56, 0x42, 0x00) cut command at end
    const last4 = buffer.slice(-4);
    expect(Array.from(last4)).toEqual([0x1d, 0x56, 0x42, 0x00]);

    // Test print execution
    const testPrintRes = await printerService.testPrint(sampleConfig);
    expect(testPrintRes.success).toBe(true);
    expect(testPrintRes.bytesSent).toBeGreaterThan(50);
  });
});

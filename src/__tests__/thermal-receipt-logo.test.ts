import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ConfigService } from '../services/config.service';
import { ReceiptService } from '../services/receipt.service';
import type { IOrder, IShopConfig } from '../types';

describe('Sprint 7 Feature Tests — Thermal Receipt Logo & Image Management', () => {
  let testDb: TriwaraDatabase;
  let configService: ConfigService;
  let receiptService: ReceiptService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    configService = new ConfigService(testDb);
    receiptService = new ReceiptService();

    await testDb.shopConfig.clear();
    await testDb.shopConfig.add({
      appName: 'Warkop Triwara',
      receiptHeaderLines: ['Warkop Triwara', 'Jl. Sunset Road', '08123456789'],
      receiptFooterLines: ['Terima Kasih', 'WiFi: Triwara'],
      pinHash: '',
      printerMacAddress: '',
    });
  });

  it('saves, updates, and retrieves thermal receipt logo base64 in shop config', async () => {
    const dummyLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await configService.updateConfig({
      receiptLogoBase64: dummyLogoBase64,
    });

    let config = await configService.getConfig();
    expect(config.receiptLogoBase64).toBe(dummyLogoBase64);

    // Update with app logo as well
    const dummyAppLogo = 'data:image/png;base64,APP_LOGO_DATA';
    await configService.updateConfig({
      appLogoBase64: dummyAppLogo,
    });

    config = await configService.getConfig();
    expect(config.receiptLogoBase64).toBe(dummyLogoBase64);
    expect(config.appLogoBase64).toBe(dummyAppLogo);
  });

  it('deletes receipt logo and app logo cleanly', async () => {
    const dummyLogoBase64 = 'data:image/png;base64,SAMPLE_IMAGE';
    await configService.updateConfig({
      receiptLogoBase64: dummyLogoBase64,
      appLogoBase64: dummyLogoBase64,
    });

    let config = await configService.getConfig();
    expect(config.receiptLogoBase64).toBe(dummyLogoBase64);
    expect(config.appLogoBase64).toBe(dummyLogoBase64);

    // Delete receipt logo
    await configService.updateConfig({
      receiptLogoBase64: undefined,
    });
    config = await configService.getConfig();
    expect(config.receiptLogoBase64).toBeUndefined();
    expect(config.appLogoBase64).toBe(dummyLogoBase64);

    // Delete app logo
    await configService.updateConfig({
      appLogoBase64: undefined,
    });
    config = await configService.getConfig();
    expect(config.appLogoBase64).toBeUndefined();
  });

  it('generates 3 types of 58mm thermal receipts with store branding', () => {
    const sampleConfig: IShopConfig = {
      appName: 'Warkop Triwara Specialty',
      appLogoBase64: 'data:image/png;base64,APP',
      receiptLogoBase64: 'data:image/png;base64,RECEIPT',
      receiptHeaderLines: ['Warkop Triwara Specialty', 'Jl. Sunset Road No. 88, Bali', 'Telp: 0812-3456-7890'],
      receiptFooterLines: ['Terima Kasih!', 'WiFi: Triwara | Pass: kopienak'],
      printerMacAddress: '00:11:22:33:44:55',
      pinHash: '',
    };

    const sampleOrder: IOrder = {
      id: 101,
      orderNumber: 'TRW-20260829-0001',
      sequenceNumber: 1,
      customerName: 'Kak Budi',
      createdAt: new Date('2026-08-29T10:00:00Z'),
      items: [
        {
          productId: 1,
          productName: 'Kopi Susu Aren',
          qty: 2,
          price: 20000,
          hpp: 8000,
          subtotal: 40000,
          hppSubtotal: 16000,
          toppings: [{ name: 'Extra Shot', price: 5000, hppCost: 2000 }],
          notes: 'Less sugar',
          orderType: 'takeaway',
        },
      ],
      subtotal: 50000,
      discountPercent: 10,
      discountAmount: 5000,
      total: 45000,
      hppTotal: 18000,
      profit: 27000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 5000,
      status: 'completed',
    };

    // 1. Customer receipt
    const customerReceipt = receiptService.generateReceiptText(sampleOrder, sampleConfig, 'customer');
    expect(customerReceipt).toContain('Warkop Triwara Specialty');
    expect(customerReceipt).toContain('TRW-20260829-0001');
    expect(customerReceipt).toContain('Kopi Susu Aren');
    expect(customerReceipt).toContain('Extra Shot');
    expect(customerReceipt).toContain('45.000');
    expect(customerReceipt).toContain('Terima Kasih!');

    // 2. Bar receipt
    const barReceipt = receiptService.generateReceiptText(sampleOrder, sampleConfig, 'bar');
    expect(barReceipt).toContain('ORDER BAR');
    expect(barReceipt).toContain('TRW-20260829-0001');
    expect(barReceipt).toContain('Kopi Susu Aren');
    expect(barReceipt).toContain('Less sugar');

    // 3. Kitchen receipt
    const kitchenReceipt = receiptService.generateReceiptText(sampleOrder, sampleConfig, 'kitchen');
    expect(kitchenReceipt).toContain('ORDER DAPUR');
    expect(kitchenReceipt).toContain('TRW-20260829-0001');
    expect(kitchenReceipt).toContain('Kak Budi');
  });
});

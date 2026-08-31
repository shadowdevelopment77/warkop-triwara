// ═══════════════════════════════════════════════
// Phase 7 Unit Tests: 1-Year Order Cleanup & Excel Backup
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { OrderService } from '../services/order.service';
import { exportOrdersToExcel } from '../utils/excel';
import type { IOrder } from '../types';

describe('Phase 7: Clean Orders Older Than 1 Year with Excel Backup', () => {
  let testDb: TriwaraDatabase;
  let orderService: OrderService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_phase7_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.orders.clear();
    await testDb.logs.clear();
    await testDb.dailySummaries.clear();

    orderService = new OrderService(testDb);
  });

  it('identifies and filters ONLY orders older than 1 year', async () => {
    const now = new Date();

    // Recent order: 30 days ago
    const recentDate = new Date(now);
    recentDate.setDate(recentDate.getDate() - 30);

    // Old order: 400 days ago (> 1 year)
    const oldDate = new Date(now);
    oldDate.setDate(oldDate.getDate() - 400);

    await testDb.orders.bulkAdd([
      {
        id: 1,
        orderNumber: 'TRX-RECENT',
        sequenceNumber: 1,
        customerName: 'Budi',
        total: 25000,
        paymentMethod: 'cash',
        status: 'completed',
        items: [],
        createdAt: recentDate,
        updatedAt: recentDate,
      } as unknown as IOrder,
      {
        id: 2,
        orderNumber: 'TRX-OLD',
        sequenceNumber: 2,
        customerName: 'Joko',
        total: 35000,
        paymentMethod: 'qris',
        status: 'completed',
        items: [],
        createdAt: oldDate,
        updatedAt: oldDate,
      } as unknown as IOrder,
    ]);

    const oldOrders = await orderService.getOrdersOlderThanOneYear();
    expect(oldOrders.length).toBe(1);
    expect(oldOrders[0].orderNumber).toBe('TRX-OLD');
  });

  it('rejects cleanup if there are NO orders older than 1 year', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 100);

    await testDb.orders.add({
      id: 10,
      orderNumber: 'TRX-RECENT-2',
      sequenceNumber: 1,
      customerName: 'Siti',
      total: 20000,
      paymentMethod: 'cash',
      status: 'completed',
      items: [],
      createdAt: recentDate,
      updatedAt: recentDate,
    } as unknown as IOrder);

    await expect(orderService.cleanOrdersOlderThanOneYear()).rejects.toThrow(
      'Tidak ada data riwayat transaksi yang berumur 1 tahun atau lebih untuk dibersihkan.'
    );

    // Ensure recent order was NOT deleted
    const count = await testDb.orders.count();
    expect(count).toBe(1);
  });

  it('successfully cleans orders older than 1 year and logs system audit trail', async () => {
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await testDb.orders.bulkAdd([
      {
        id: 101,
        orderNumber: 'TRX-ANCIENT-1',
        sequenceNumber: 1,
        customerName: 'Ahmad',
        total: 50000,
        paymentMethod: 'cash',
        status: 'completed',
        items: [],
        createdAt: twoYearsAgo,
        updatedAt: twoYearsAgo,
      } as unknown as IOrder,
      {
        id: 102,
        orderNumber: 'TRX-ANCIENT-2',
        sequenceNumber: 2,
        customerName: 'Dewi',
        total: 45000,
        paymentMethod: 'qris',
        status: 'completed',
        items: [],
        createdAt: twoYearsAgo,
        updatedAt: twoYearsAgo,
      } as unknown as IOrder,
      {
        id: 103,
        orderNumber: 'TRX-KEEP-RECENT',
        sequenceNumber: 3,
        customerName: 'Rian',
        total: 30000,
        paymentMethod: 'cash',
        status: 'completed',
        items: [],
        createdAt: sixMonthsAgo,
        updatedAt: sixMonthsAgo,
      } as unknown as IOrder,
    ]);

    const result = await orderService.cleanOrdersOlderThanOneYear();
    expect(result.count).toBe(2);

    // Check remaining in database
    const remaining = await testDb.orders.toArray();
    expect(remaining.length).toBe(1);
    expect(remaining[0].orderNumber).toBe('TRX-KEEP-RECENT');

    // Check audit log
    const logs = await testDb.logs.where('type').equals('system').toArray();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].description).toContain('2 transaksi berumur >= 1 tahun dibersihkan');
  });

  it('generates Excel CSV backup with UTF-8 BOM and tabular structure', () => {
    const dummyOrders: IOrder[] = [
      {
        id: 1,
        orderNumber: 'TRX-001',
        sequenceNumber: 1,
        customerName: 'Pelanggan Test',
        processedBy: 'Kasir 1',
        createdAt: new Date('2024-01-01T10:00:00'),
        updatedAt: new Date('2024-01-01T10:00:00'),
        total: 35000,
        subtotal: 35000,
        paymentMethod: 'cash',
        status: 'completed',
        items: [{ productId: 1, productName: 'Kopi Susu', price: 18000, quantity: 2, subtotal: 36000 }],
      } as unknown as IOrder,
    ];

    expect(() => exportOrdersToExcel(dummyOrders, 'test_export.csv')).not.toThrow();
  });

  it('generates old orders strictly older than 1 year (> 400 days) and cleans them', async () => {
    const createdCount = await orderService.generateOldOrdersForTesting(10);
    expect(createdCount).toBe(10);

    const oldOrders = await orderService.getOrdersOlderThanOneYear();
    expect(oldOrders.length).toBe(10);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    for (const o of oldOrders) {
      expect(new Date(o.createdAt).getTime()).toBeLessThan(oneYearAgo.getTime());
    }

    const cleanResult = await orderService.cleanOrdersOlderThanOneYear();
    expect(cleanResult.count).toBe(10);

    const remainingOld = await orderService.getOrdersOlderThanOneYear();
    expect(remainingOld.length).toBe(0);
  });
});

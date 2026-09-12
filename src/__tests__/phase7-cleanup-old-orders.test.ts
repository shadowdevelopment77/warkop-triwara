// ═══════════════════════════════════════════════
// Phase 7 Unit Tests: 1-Year Order Cleanup & Excel Backup
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { OrderService } from '../services/order.service';
import { exportOrdersToExcel, buildOrdersCsvContent } from '../utils/excel';
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

  it('generates Excel CSV backup with UTF-8 BOM and tabular structure', async () => {
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
        items: [{ productId: 1, productName: 'Kopi Susu', price: 18000, qty: 2, subtotal: 36000 } as any],
      } as unknown as IOrder,
    ];

    const csv = buildOrdersCsvContent(dummyOrders);
    expect(csv).toContain('\uFEFF');
    expect(csv).toContain('No Pesanan');
    expect(csv).toContain('TRX-001');
    expect(csv).toContain('Kopi Susu x2');

    await expect(exportOrdersToExcel(dummyOrders, 'test_export.csv')).resolves.not.toThrow();
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

  it('SIMULASI LIVE PRODUCTION: Sales sedang berjalan hari ini TIDAK BOLEH tersentuh saat arsip 1 tahun dibersihkan', async () => {
    // 1. Simulasikan shift kasir yang sedang AKTIF berjalan
    await testDb.shifts.add({
      id: 1,
      shiftNumber: 'SHF-20260912-001',
      cashierId: 1,
      cashierName: 'Kasir Aktif',
      openedAt: new Date(),
      startingCash: 100000,
      totalCashSales: 25000,
      totalQrisSales: 50000,
      totalTransactions: 2,
      totalVoided: 0,
      status: 'open',
    });

    // 2. Simulasikan 2 transaksi AKTIF HARI INI (sales sedang berjalan di toko client)
    const today = new Date();
    const activeOrders: IOrder[] = [
      {
        id: 501,
        orderNumber: 'TRW-TODAY-001',
        sequenceNumber: 1,
        customerName: 'Pelanggan Pagi',
        processedBy: 'Kasir Aktif',
        createdAt: today,
        updatedAt: today,
        total: 25000,
        subtotal: 25000,
        paymentMethod: 'cash',
        status: 'completed',
        items: [{ productId: 1, productName: 'Kopi Susu', price: 25000, qty: 1, subtotal: 25000 } as any],
      } as unknown as IOrder,
      {
        id: 502,
        orderNumber: 'TRW-TODAY-002',
        sequenceNumber: 2,
        customerName: 'Pelanggan Siang',
        processedBy: 'Kasir Aktif',
        createdAt: today,
        updatedAt: today,
        total: 50000,
        subtotal: 50000,
        paymentMethod: 'qris',
        status: 'completed',
        items: [{ productId: 2, productName: 'Matcha Latte', price: 25000, qty: 2, subtotal: 50000 } as any],
      } as unknown as IOrder,
    ];
    await testDb.orders.bulkAdd(activeOrders);

    // 3. Simulasikan dailySummaries hari ini (omset live = 75.000)
    const todayDateStr = today.toISOString().split('T')[0];
    await testDb.dailySummaries.add({
      date: todayDateStr,
      totalOmset: 75000,
      totalProfit: 40000,
      totalCash: 25000,
      totalQris: 50000,
      completedCount: 2,
      voidedCount: 0,
      totalItemsSold: 3,
      topProductName: 'Matcha Latte',
      topProductPercentage: 66,
      productSales: {},
      createdAt: today,
      updatedAt: today,
    });

    // 4. Masukkan 5 transaksi lama berumur 420 hari (>= 1 tahun)
    await orderService.generateOldOrdersForTesting(5);

    // Total orders saat ini: 2 transaksi hari ini + 5 transaksi lama = 7
    expect(await testDb.orders.count()).toBe(7);

    // 5. Jalankan deteksi transaksi lama
    const eligibleOld = await orderService.getOrdersOlderThanOneYear();
    expect(eligibleOld.length).toBe(5);

    // Pastikan TIDAK ADA transaksi hari ini yang masuk daftar arsip
    for (const old of eligibleOld) {
      expect(old.orderNumber).not.toContain('TODAY');
      expect(old.createdAt.getTime()).toBeLessThan(Date.now() - 365 * 24 * 3600 * 1000);
    }

    // 6. Jalankan ekspor Excel & pembersihan database
    await exportOrdersToExcel(eligibleOld, 'Arsip_Uji_Simulasi.csv');
    const cleanResult = await orderService.cleanOrdersOlderThanOneYear();
    expect(cleanResult.count).toBe(5);

    // 7. VERIFIKASI KEAMANAN DATA SALES AKTIF:
    // a. Sisa transaksi di database tepat 2 (hanya transaksi HARI INI yang tertinggal)
    const remainingOrders = await testDb.orders.toArray();
    expect(remainingOrders.length).toBe(2);
    expect(remainingOrders.map((o) => o.orderNumber)).toEqual(['TRW-TODAY-001', 'TRW-TODAY-002']);

    // b. DailySummaries hari ini TETAP 75.000 (tidak berkurang atau terhapus)
    const summaryToday = await testDb.dailySummaries.where('date').equals(todayDateStr).first();
    expect(summaryToday).toBeDefined();
    expect(summaryToday?.totalOmset).toBe(75000);
    expect(summaryToday?.completedCount).toBe(2);

    // c. Shift kasir yang sedang aktif TETAP open dan tidak terganggu
    const currentShift = await testDb.shifts.get(1);
    expect(currentShift).toBeDefined();
    expect(currentShift?.status).toBe('open');
    expect(currentShift?.cashierName).toBe('Kasir Aktif');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';
import type { IOrder, IDailySummary } from '../types';

describe('Scope 6: Hybrid Rollup Sales Statistics & PDF Spacing Tests', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    reportService = new ReportService(testDb);

    await testDb.orders.clear();
    await testDb.dailySummaries.clear();
  });

  it('Hybrid Rollup aggregates past dailySummaries with today live orders seamlessly', async () => {
    // 1. Setup past daily summaries (Yesterday: 2026-08-30 and 2 days ago: 2026-08-29)
    const summary1: IDailySummary = {
      date: '2026-08-29',
      totalOmset: 100000,
      totalProfit: 60000,
      totalCash: 70000,
      totalQris: 30000,
      completedCount: 5,
      voidedCount: 0,
      totalItemsSold: 8,
      topProductName: 'Kopi Susu',
      topProductPercentage: 62.5,
      productSales: {
        '1': {
          productId: 1,
          productName: 'Kopi Susu',
          quantitySold: 5,
          totalRevenue: 75000,
        },
      },
      createdAt: new Date('2026-08-29T23:59:00'),
      updatedAt: new Date('2026-08-29T23:59:00'),
    };

    const summary2: IDailySummary = {
      date: '2026-08-30',
      totalOmset: 150000,
      totalProfit: 90000,
      totalCash: 50000,
      totalQris: 100000,
      completedCount: 7,
      voidedCount: 1,
      totalItemsSold: 12,
      topProductName: 'Kopi Susu',
      topProductPercentage: 50,
      productSales: {
        '1': {
          productId: 1,
          productName: 'Kopi Susu',
          quantitySold: 6,
          totalRevenue: 90000,
        },
        '2': {
          productId: 2,
          productName: 'Matcha Latte',
          quantitySold: 6,
          totalRevenue: 60000,
        },
      },
      createdAt: new Date('2026-08-30T23:59:00'),
      updatedAt: new Date('2026-08-30T23:59:00'),
    };

    await testDb.dailySummaries.bulkAdd([summary1, summary2]);

    // 2. Setup Today's Live Order (created right now)
    const now = new Date();
    const todayOrder: IOrder = {
      orderNumber: 'TRW-LIVE-TODAY-01',
      sequenceNumber: 1,
      customerName: 'Customer Hari Ini',
      items: [
        {
          productId: 2,
          productName: 'Matcha Latte',
          price: 20000,
          hpp: 8000,
          qty: 4,
          orderType: 'dine_in',
          subtotal: 80000,
          hppSubtotal: 32000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 80000,
      discountPercent: 0,
      discountAmount: 0,
      total: 80000,
      hppTotal: 32000,
      profit: 48000,
      paymentMethod: 'cash',
      paymentAmount: 100000,
      changeAmount: 20000,
      status: 'completed',
      createdAt: now,
    };
    await testDb.orders.add(todayOrder);

    // 3. Query range from 2026-08-29 to Today
    const startDate = new Date('2026-08-29T00:00:00');
    const endDate = now;

    const summary = await reportService.getSalesSummary(startDate, endDate);

    // Verification of hybrid total:
    // Past: 100k + 150k = 250k. Today: 80k. Total = 330k.
    expect(summary.totalOmset).toBe(330000);

    // Profit: Past: 60k + 90k = 150k. Today: 48k. Total = 198k.
    expect(summary.totalProfit).toBe(198000);

    // Cash: Past: 70k + 50k = 120k. Today: 80k. Total = 200k.
    expect(summary.totalCash).toBe(200000);

    // QRIS: Past: 30k + 100k = 130k. Today: 0. Total = 130k.
    expect(summary.totalQris).toBe(130000);

    // Completed count: 5 + 7 + 1 = 13
    expect(summary.completedCount).toBe(13);

    // Total items sold: 8 + 12 + 4 = 24
    expect(summary.totalItemsSold).toBe(24);
  });

  it('Hybrid Rollup accurately ranks top selling products across historical & live data', async () => {
    const summary: IDailySummary = {
      date: '2026-08-30',
      totalOmset: 200000,
      totalProfit: 100000,
      totalCash: 200000,
      totalQris: 0,
      completedCount: 10,
      voidedCount: 0,
      totalItemsSold: 15,
      topProductName: 'Americano',
      topProductPercentage: 66,
      productSales: {
        '10': {
          productId: 10,
          productName: 'Americano',
          quantitySold: 10,
          totalRevenue: 150000,
        },
      },
      createdAt: new Date('2026-08-30T23:59:00'),
      updatedAt: new Date('2026-08-30T23:59:00'),
    };
    await testDb.dailySummaries.add(summary);

    const now = new Date();
    await testDb.orders.add({
      orderNumber: 'TRW-LIVE-TODAY-02',
      sequenceNumber: 1,
      customerName: 'Coffee Lover',
      items: [
        {
          productId: 10,
          productName: 'Americano',
          price: 15000,
          hpp: 5000,
          qty: 5, // Now Americano has 10 (past) + 5 (today) = 15 sold!
          orderType: 'dine_in',
          subtotal: 75000,
          hppSubtotal: 25000,
          toppings: [],
          notes: '',
        },
        {
          productId: 20,
          productName: 'Caramel Macchiato',
          price: 28000,
          hpp: 12000,
          qty: 3,
          orderType: 'dine_in',
          subtotal: 84000,
          hppSubtotal: 36000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 159000,
      discountPercent: 0,
      discountAmount: 0,
      total: 159000,
      hppTotal: 61000,
      profit: 98000,
      paymentMethod: 'cash',
      paymentAmount: 160000,
      changeAmount: 1000,
      status: 'completed',
      createdAt: now,
    });

    const topProducts = await reportService.getTopSellingProducts(new Date('2026-08-30T00:00:00'), now, 5);

    expect(topProducts).toHaveLength(2);
    expect(topProducts[0].productName).toBe('Americano');
    expect(topProducts[0].quantitySold).toBe(15);
    expect(topProducts[1].productName).toBe('Caramel Macchiato');
    expect(topProducts[1].quantitySold).toBe(3);
  });
});

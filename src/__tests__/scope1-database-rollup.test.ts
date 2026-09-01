import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';
import { ShiftService } from '../services/shift.service';
import type { IOrder, IStaff } from '../types';

describe('Scope 1: Database Schema v3 & Daily Summary Rollup Tests', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;
  let shiftService: ShiftService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    reportService = new ReportService(testDb);
    shiftService = new ShiftService(testDb);

    await testDb.orders.clear();
    await testDb.shifts.clear();
    await testDb.dailySummaries.clear();
  });

  it('Schema v3: verifies dailySummaries table exists and stores records with unique date index', async () => {
    expect(testDb.dailySummaries).toBeDefined();

    const testDate = '2026-08-31';
    await testDb.dailySummaries.add({
      date: testDate,
      totalOmset: 150000,
      totalProfit: 80000,
      totalCash: 100000,
      totalQris: 50000,
      completedCount: 5,
      voidedCount: 1,
      totalItemsSold: 8,
      topProductName: 'Kopi Susu Aren',
      topProductPercentage: 50,
      productSales: {
        '1': { productId: 1, productName: 'Kopi Susu Aren', quantitySold: 4, totalRevenue: 80000 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const retrieved = await testDb.dailySummaries.where('date').equals(testDate).first();
    expect(retrieved).toBeDefined();
    expect(retrieved?.totalOmset).toBe(150000);
    expect(retrieved?.topProductName).toBe('Kopi Susu Aren');
  });

  it('Calculates daily rollup summary accurately from day orders', async () => {
    const today = new Date('2026-08-31T14:00:00');

    // 1. Completed Cash Order (Kopi Susu x2)
    await testDb.orders.add({
      orderNumber: 'TRW-20260831-001',
      sequenceNumber: 1,
      customerName: 'Budi',
      items: [
        {
          productId: 101,
          productName: 'Kopi Susu Aren',
          price: 20000,
          hpp: 8000,
          qty: 2,
          orderType: 'dine_in',
          subtotal: 40000,
          hppSubtotal: 16000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 40000,
      discountPercent: 0,
      discountAmount: 0,
      total: 40000,
      hppTotal: 16000,
      profit: 24000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 10000,
      status: 'completed',
      createdAt: new Date('2026-08-31T10:00:00'),
    } as unknown as IOrder);

    // 2. Completed QRIS Order (Americano x1, Donat x1)
    await testDb.orders.add({
      orderNumber: 'TRW-20260831-002',
      sequenceNumber: 2,
      customerName: 'Siti',
      items: [
        {
          productId: 102,
          productName: 'Americano',
          price: 15000,
          hpp: 5000,
          qty: 1,
          orderType: 'takeaway',
          subtotal: 15000,
          hppSubtotal: 5000,
          toppings: [],
          notes: '',
        },
        {
          productId: 103,
          productName: 'Donat Cokelat',
          price: 10000,
          hpp: 4000,
          qty: 1,
          orderType: 'takeaway',
          subtotal: 10000,
          hppSubtotal: 4000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 25000,
      discountPercent: 0,
      discountAmount: 0,
      total: 25000,
      hppTotal: 9000,
      profit: 16000,
      paymentMethod: 'qris',
      paymentAmount: 25000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-08-31T12:30:00'),
    } as unknown as IOrder);

    // 3. Voided Order (Should not count in omset/profit)
    await testDb.orders.add({
      orderNumber: 'TRW-20260831-003',
      sequenceNumber: 3,
      customerName: 'Salah Pesan',
      items: [],
      subtotal: 30000,
      discountPercent: 0,
      discountAmount: 0,
      total: 30000,
      hppTotal: 10000,
      profit: 20000,
      paymentMethod: 'cash',
      paymentAmount: 30000,
      changeAmount: 0,
      status: 'voided',
      createdAt: new Date('2026-08-31T13:00:00'),
    } as unknown as IOrder);

    const summary = await reportService.syncDailySummary(today);

    expect(summary.date).toBe('2026-08-31');
    expect(summary.totalOmset).toBe(65000); // 40.000 + 25.000
    expect(summary.totalCash).toBe(40000);
    expect(summary.totalQris).toBe(25000);
    expect(summary.totalProfit).toBe(40000); // 24.000 + 16.000
    expect(summary.completedCount).toBe(2);
    expect(summary.voidedCount).toBe(1);
    expect(summary.totalItemsSold).toBe(4); // 2 Kopi Susu + 1 Americano + 1 Donat

    // Product breakdown
    expect(summary.topProductName).toBe('Kopi Susu Aren');
    expect(summary.topProductPercentage).toBe(50); // 2 out of 4 items = 50%
    expect(summary.productSales['101'].quantitySold).toBe(2);
    expect(summary.productSales['102'].quantitySold).toBe(1);
    expect(summary.productSales['103'].quantitySold).toBe(1);
  });

  it('Updates existing daily summary without creating duplicate rows on subsequent syncs', async () => {
    const today = new Date('2026-08-31T10:00:00');

    await reportService.syncDailySummary(today);
    let count = await testDb.dailySummaries.count();
    expect(count).toBe(1);

    // Sync again (e.g. after new transaction or closing shift)
    await reportService.syncDailySummary(today);
    count = await testDb.dailySummaries.count();
    expect(count).toBe(1); // Stays 1, updated via put
  });

  it('ShiftService.closeShift automatically invokes syncDailySummary', async () => {
    const cashier: IStaff = {
      id: 1,
      name: 'Rian Barista',
      pin: '1234',
      role: 'cashier',
      active: true,
      createdAt: new Date(),
    };

    const shift = await shiftService.openShift(cashier, 100000);
    expect(shift.status).toBe('open');

    // Add a completed order to shift
    const order: IOrder = {
      orderNumber: 'TRW-20260831-099',
      sequenceNumber: 1,
      customerName: 'Andi',
      items: [
        {
          productId: 1,
          productName: 'V60 Specialty',
          price: 30000,
          hpp: 12000,
          qty: 1,
          orderType: 'dine_in',
          subtotal: 30000,
          hppSubtotal: 12000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 30000,
      discountPercent: 0,
      discountAmount: 0,
      total: 30000,
      hppTotal: 12000,
      profit: 18000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 20000,
      status: 'completed',
      shiftId: shift.id,
      createdAt: new Date(),
    };
    await testDb.orders.add(order);
    await shiftService.recordOrderToShift(order);

    // Close the shift
    const closed = await shiftService.closeShift(shift.id!, 130000, 'Shift lancar');
    expect(closed.status).toBe('closed');

    // Verify daily summary was automatically created
    const summaries = await testDb.dailySummaries.toArray();
    expect(summaries.length).toBeGreaterThanOrEqual(1);
    const todaySummary = summaries[0];
    expect(todaySummary.totalOmset).toBe(30000);
    expect(todaySummary.completedCount).toBe(1);
    expect(todaySummary.topProductName).toBe('V60 Specialty');
  });
});

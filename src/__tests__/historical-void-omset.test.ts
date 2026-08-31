import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { OrderService } from '../services/order.service';
import { ReportService } from '../services/report.service';
import { HppService } from '../services/hpp.service';
import { toInputDateString } from '../utils/date';
import type { IOrder, IShift } from '../types';

describe('Historical Void & Omset Integrity Tests', () => {
  let testDb: TriwaraDatabase;
  let orderService: OrderService;
  let reportService: ReportService;
  let hppService: HppService;

  beforeEach(async () => {
    const dbName = `TriwaraVoidOmsetTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    testDb = new TriwaraDatabase(dbName);
    await testDb.open();

    hppService = new HppService(testDb);
    orderService = new OrderService(testDb, hppService);
    reportService = new ReportService(testDb);
  });

  afterEach(async () => {
    orderService.clearPaginationCache();
    reportService.invalidateCache();
    await testDb.delete();
  });

  it('correctly deducts omset from yesterday summary when yesterday order is voided today', async () => {
    // 1. Setup yesterday and today dates
    const yesterday = new Date(2026, 7, 31, 14, 30, 0); // 31 Aug 2026 14:30
    const today = new Date(2026, 8, 1, 10, 0, 0); // 1 Sep 2026 10:00

    const yesterdayKey = toInputDateString(yesterday);
    const todayKey = toInputDateString(today);

    // 2. Add an order yesterday
    const orderYesterday: IOrder = {
      orderNumber: 'TRX-YEST-001',
      sequenceNumber: 1,
      customerName: 'Budi',
      processedBy: 'Kasir 1',
      items: [
        {
          productId: 1,
          productName: 'Kopi Susu',
          price: 15000,
          hpp: 5000,
          hppSubtotal: 10000,
          qty: 2,
          orderType: 'dine_in',
          toppings: [],
          notes: '',
          subtotal: 30000,
        },
      ],
      subtotal: 30000,
      discountPercent: 0,
      discountAmount: 0,
      total: 30000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 20000,
      status: 'completed',
      hppTotal: 10000,
      profit: 20000,
      createdAt: yesterday,
    };

    const orderId = (await testDb.orders.add(orderYesterday)) as number;
    orderYesterday.id = orderId;

    // Create daily summary for yesterday
    await reportService.recordOrderToDailySummary(orderYesterday);

    const initialYesterdaySummary = await reportService.getDailySummary(yesterdayKey);
    expect(initialYesterdaySummary?.totalOmset).toBe(30000);
    expect(initialYesterdaySummary?.completedCount).toBe(1);
    expect(initialYesterdaySummary?.voidedCount).toBe(0);

    // 3. Void that yesterday order today
    await orderService.voidOrder(orderId, 'Salah input kemarin');

    // 4. Verify yesterday summary
    const updatedYesterdaySummary = await reportService.getDailySummary(yesterdayKey);
    expect(updatedYesterdaySummary?.totalOmset).toBe(0);
    expect(updatedYesterdaySummary?.completedCount).toBe(0);
    expect(updatedYesterdaySummary?.voidedCount).toBe(1);
    expect(updatedYesterdaySummary?.totalCash).toBe(0);

    // 5. Verify today summary is not created or affected
    const todaySummary = await reportService.getDailySummary(todayKey);
    expect(todaySummary).toBeNull();
  });

  it('triggers auto-sync fail-safe if existing daily summary was not yet created for historical void', async () => {
    const historicalDate = new Date(2026, 6, 15, 12, 0, 0); // 15 July 2026
    const historicalKey = toInputDateString(historicalDate);

    // Add 2 orders for that historical date
    const order1: IOrder = {
      orderNumber: 'TRX-HIST-001',
      sequenceNumber: 1,
      customerName: 'Pelanggan 1',
      items: [
        {
          productId: 1,
          productName: 'Es Teh',
          price: 5000,
          hpp: 2000,
          hppSubtotal: 2000,
          qty: 1,
          orderType: 'dine_in',
          toppings: [],
          notes: '',
          subtotal: 5000,
        },
      ],
      subtotal: 5000,
      discountPercent: 0,
      discountAmount: 0,
      total: 5000,
      paymentMethod: 'cash',
      paymentAmount: 5000,
      changeAmount: 0,
      status: 'completed',
      hppTotal: 2000,
      profit: 3000,
      createdAt: historicalDate,
    };
    const order2: IOrder = {
      orderNumber: 'TRX-HIST-002',
      sequenceNumber: 2,
      customerName: 'Pelanggan 2',
      items: [
        {
          productId: 2,
          productName: 'Kopi Hitam',
          price: 10000,
          hpp: 4000,
          hppSubtotal: 4000,
          qty: 1,
          orderType: 'dine_in',
          toppings: [],
          notes: '',
          subtotal: 10000,
        },
      ],
      subtotal: 10000,
      discountPercent: 0,
      discountAmount: 0,
      total: 10000,
      paymentMethod: 'qris',
      paymentAmount: 10000,
      changeAmount: 0,
      status: 'completed',
      hppTotal: 4000,
      profit: 6000,
      createdAt: historicalDate,
    };

    const id1 = (await testDb.orders.add(order1)) as number;
    await testDb.orders.add(order2);

    // Notice: dailySummaries does NOT have an entry for historicalKey yet!
    const preSummary = await reportService.getDailySummary(historicalKey);
    expect(preSummary).toBeNull();

    // Now void order 1
    await orderService.voidOrder(id1, 'Batal');

    // Auto-sync should have compiled the day's summary accurately!
    const postSummary = await reportService.getDailySummary(historicalKey);
    expect(postSummary).not.toBeNull();
    // Only order 2 remains completed (omset 10000)
    expect(postSummary?.totalOmset).toBe(10000);
    expect(postSummary?.totalQris).toBe(10000);
    expect(postSummary?.totalCash).toBe(0);
    expect(postSummary?.completedCount).toBe(1);
    expect(postSummary?.voidedCount).toBe(1);
  });

  it('updates closed shift cash difference and void count when voiding shift order', async () => {
    const shiftDate = new Date(2026, 7, 30, 8, 0, 0);

    const closedShift: IShift = {
      id: 5,
      shiftNumber: 'SHF-20260830-001',
      cashierId: 1,
      cashierName: 'Kasir Kemarin',
      openedAt: shiftDate,
      closedAt: new Date(shiftDate.getTime() + 8 * 3600000),
      startingCash: 50000,
      totalCashSales: 150000,
      totalQrisSales: 50000,
      totalTransactions: 5,
      cashTransactions: 3,
      qrisTransactions: 2,
      totalVoided: 0,
      totalExpenses: 20000,
      expectedEndingCash: 180000, // 50k + 150k - 20k
      actualEndingCash: 180000,
      cashDifference: 0, // exact
      status: 'closed',
    };
    await testDb.shifts.add(closedShift);

    // Create order associated with this shift
    const order: IOrder = {
      orderNumber: 'TRX-SHF-001',
      sequenceNumber: 1,
      customerName: 'Pelanggan Shift',
      shiftId: 5,
      items: [
        {
          productId: 1,
          productName: 'Kopi',
          price: 50000,
          hpp: 15000,
          hppSubtotal: 15000,
          qty: 1,
          orderType: 'dine_in',
          toppings: [],
          notes: '',
          subtotal: 50000,
        },
      ],
      subtotal: 50000,
      discountPercent: 0,
      discountAmount: 0,
      total: 50000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 0,
      status: 'completed',
      hppTotal: 15000,
      profit: 35000,
      createdAt: shiftDate,
    };
    const orderId = (await testDb.orders.add(order)) as number;

    // Void the order
    await orderService.voidOrder(orderId, 'Salah catat');

    const updatedShift = await testDb.shifts.get(5);
    expect(updatedShift?.totalVoided).toBe(1);
    expect(updatedShift?.totalCashSales).toBe(100000); // 150k - 50k
    // expected ending cash: 50k starting + 100k cash - 20k expenses = 130k
    expect(updatedShift?.expectedEndingCash).toBe(130000);
    // cashDifference: actual (180k) - expected (130k) = +50k
    expect(updatedShift?.cashDifference).toBe(50000);
  });
});

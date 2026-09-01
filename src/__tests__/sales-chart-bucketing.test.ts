import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';
import type { IOrder } from '../types';

describe('Sales Chart Dynamic Bucketing Tests (5 Modes)', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    reportService = new ReportService(testDb);
    await testDb.orders.clear();
  });

  it('Mode 1: Harian (1 Hari) produces 24 hourly points', async () => {
    const today = new Date('2026-08-31T10:00:00');

    // Add completed orders at 09:15 and 14:30
    await testDb.orders.add({
      orderNumber: 'TRW-20260831-001',
      sequenceNumber: 1,
      customerName: 'Budi',
      items: [],
      subtotal: 20000,
      discountPercent: 0,
      total: 20000,
      profit: 10000,
      paymentMethod: 'cash',
      paymentAmount: 20000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-08-31T09:15:00'),
    } as unknown as IOrder);

    await testDb.orders.add({
      orderNumber: 'TRW-20260831-002',
      sequenceNumber: 2,
      customerName: 'Ani',
      items: [],
      subtotal: 35000,
      discountPercent: 0,
      total: 35000,
      profit: 20000,
      paymentMethod: 'qris',
      paymentAmount: 35000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-08-31T14:30:00'),
    } as unknown as IOrder);

    const result = await reportService.getSalesChartData(today, today);

    expect(result.mode).toBe('hourly');
    expect(result.points).toHaveLength(24);
    expect(result.points[9].omset).toBe(20000);
    expect(result.points[9].orderCount).toBe(1);
    expect(result.points[14].omset).toBe(35000);
    expect(result.points[14].orderCount).toBe(1);
    expect(result.totalOmset).toBe(55000);
    expect(result.peakPoint?.label).toBe('14:00');
    expect(result.peakPoint?.omset).toBe(35000);
  });

  it('Mode 2: 3 Hari produces 18 interval points (6 slots of 4 hours per day)', async () => {
    const start = new Date('2026-08-25T00:00:00');
    const end = new Date('2026-08-27T23:59:59');

    // Order on Day 1 (Aug 25) at 21:00 (slot 5: 20-24)
    await testDb.orders.add({
      orderNumber: 'TRW-20260825-001',
      sequenceNumber: 1,
      customerName: 'Doni',
      items: [],
      subtotal: 50000,
      discountPercent: 0,
      total: 50000,
      profit: 25000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-08-25T21:00:00'),
    } as unknown as IOrder);

    const result = await reportService.getSalesChartData(start, end);

    expect(result.mode).toBe('interval');
    // 3 days * 6 slots = 18 points
    expect(result.points).toHaveLength(18);
    // Day 0 slot 5 = index 5 (20:00 - 24:00)
    expect(result.points[5].omset).toBe(50000);
    expect(result.points[5].orderCount).toBe(1);
    expect(result.totalOmset).toBe(50000);
    expect(result.peakPoint?.omset).toBe(50000);
  });

  it('Mode 3: 14 Hari produces 14 daily points', async () => {
    const start = new Date('2026-08-10T00:00:00');
    const end = new Date('2026-08-23T23:59:59');

    await testDb.orders.add({
      orderNumber: 'TRW-20260815-001',
      sequenceNumber: 1,
      customerName: 'Siti',
      items: [],
      subtotal: 100000,
      discountPercent: 0,
      total: 100000,
      profit: 60000,
      paymentMethod: 'cash',
      paymentAmount: 100000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-08-15T12:00:00'),
    } as unknown as IOrder);

    const result = await reportService.getSalesChartData(start, end);

    expect(result.mode).toBe('daily');
    expect(result.points).toHaveLength(14);
    // Aug 15 is index 5
    expect(result.points[5].omset).toBe(100000);
    expect(result.totalOmset).toBe(100000);
  });

  it('Mode 4: 60 Hari produces weekly points', async () => {
    const start = new Date('2026-06-01T00:00:00');
    const end = new Date('2026-07-30T23:59:59');

    const result = await reportService.getSalesChartData(start, end);

    expect(result.mode).toBe('weekly');
    expect(result.points.length).toBeGreaterThanOrEqual(8);
  });

  it('Mode 5: Tahunan (6 Bulan) produces monthly points', async () => {
    const start = new Date('2026-01-01T00:00:00');
    const end = new Date('2026-06-30T23:59:59');

    await testDb.orders.add({
      orderNumber: 'TRW-20260310-001',
      sequenceNumber: 1,
      customerName: 'Rudi',
      items: [],
      subtotal: 75000,
      discountPercent: 0,
      total: 75000,
      profit: 40000,
      paymentMethod: 'cash',
      paymentAmount: 75000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-03-10T15:00:00'),
    } as unknown as IOrder);

    const result = await reportService.getSalesChartData(start, end);

    expect(result.mode).toBe('monthly');
    // Jan, Feb, Mar, Apr, Mei, Jun = 6 months
    expect(result.points).toHaveLength(6);
    // Index 2 is March
    expect(result.points[2].omset).toBe(75000);
    expect(result.totalOmset).toBe(75000);
    expect(result.peakPoint?.label).toContain('Mar');
  });
});

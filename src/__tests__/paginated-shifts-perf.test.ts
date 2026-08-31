import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ShiftService } from '../services/shift.service';
import { TriwaraDatabase } from '../database/db';
import type { IShift } from '../types';

describe('Paginated Shifts Performance & Index B-Tree Tests', () => {
  let testDb: TriwaraDatabase;
  let shiftService: ShiftService;

  beforeEach(async () => {
    const dbName = `TriwaraShiftTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    testDb = new TriwaraDatabase(dbName);
    await testDb.open();
    shiftService = new ShiftService(testDb);

    // Seed 120 dummy shifts (exceeding old 100 limit)
    const now = new Date(2026, 8, 1, 12, 0, 0); // 1 Sep 2026 12:00
    const dummyShifts: IShift[] = [];
    for (let i = 1; i <= 120; i++) {
      dummyShifts.push({
        id: i,
        shiftNumber: `SHF-20260901-${String(i).padStart(3, '0')}`,
        cashierId: 1,
        cashierName: 'Kasir Uji',
        openedAt: new Date(now.getTime() - i * 3600000), // each 1 hour earlier
        closedAt: new Date(now.getTime() - i * 3600000 + 1800000),
        startingCash: 50000,
        totalCashSales: 100000,
        totalQrisSales: 50000,
        totalTransactions: 10,
        cashTransactions: 7,
        qrisTransactions: 3,
        totalVoided: 0,
        expectedEndingCash: 150000,
        actualEndingCash: 150000,
        cashDifference: 0,
        status: 'closed',
      });
    }
    await testDb.shifts.bulkAdd(dummyShifts);
  });

  afterEach(async () => {
    shiftService.clearShiftPaginationCache();
    await testDb.delete();
  });

  it('fetches shifts beyond 100-limit cap with accurate metadata and reverse chronological order', async () => {
    const result = await shiftService.getPaginatedShifts('', 1, 10);

    expect(result.shifts.length).toBe(10);
    expect(result.totalCount).toBe(120); // Not capped at 100!
    expect(result.totalPages).toBe(12);
    expect(result.currentPage).toBe(1);
    expect(result.shifts[0].id).toBe(1); // newest timestamp first
  });

  it('filters shifts by local target date string successfully', async () => {
    // Shifts within 1 Sep 2026
    const result = await shiftService.getPaginatedShifts('2026-09-01', 1, 10);

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.shifts.every((s) => {
      const d = new Date(s.openedAt);
      const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localStr === '2026-09-01';
    })).toBe(true);
  });

  it('serves repeat shift page requests instantly from in-memory cache', async () => {
    const result1 = await shiftService.getPaginatedShifts('', 1, 10);

    const orderBySpy = vi.spyOn(testDb.shifts, 'orderBy');
    const result2 = await shiftService.getPaginatedShifts('', 1, 10);

    expect(result2).toBe(result1);
    expect(orderBySpy).not.toHaveBeenCalled();

    orderBySpy.mockRestore();
  });

  it('prefetches page 2 of shifts in background when page 1 is accessed', async () => {
    await shiftService.getPaginatedShifts('', 1, 10);

    // Wait for background prefetch microtask
    await new Promise((resolve) => setTimeout(resolve, 50));

    const orderBySpy = vi.spyOn(testDb.shifts, 'orderBy');
    const resultPage2 = await shiftService.getPaginatedShifts('', 2, 10);

    expect(resultPage2.currentPage).toBe(2);
    expect(resultPage2.shifts.length).toBe(10);
    expect(orderBySpy).not.toHaveBeenCalled();

    orderBySpy.mockRestore();
  });

  it('clears shift pagination cache when clearShiftPaginationCache is invoked', async () => {
    await shiftService.getPaginatedShifts('', 1, 10);
    shiftService.clearShiftPaginationCache();

    const orderBySpy = vi.spyOn(testDb.shifts, 'orderBy');
    await shiftService.getPaginatedShifts('', 1, 10);

    expect(orderBySpy).toHaveBeenCalled();
    orderBySpy.mockRestore();
  });
});

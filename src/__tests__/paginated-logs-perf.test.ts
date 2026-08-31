// ═══════════════════════════════════════════════
// Paginated Logs Performance & LRU Prefetch Cache Tests
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';
import type { ILog } from '../types';

describe('Paginated Logs Performance & LRU Prefetch Cache Tests', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_logs_perf_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.logs.clear();

    // Populate 30 test logs of various types including 'system'
    const now = new Date();
    const dummyLogs: ILog[] = [];
    for (let i = 1; i <= 30; i++) {
      const type = i % 5 === 0 ? 'system' : i % 2 === 0 ? 'inventory' : 'void';
      dummyLogs.push({
        id: i,
        type,
        description: `Test Activity Log #${i} (${type})`,
        referenceId: `REF-${i}`,
        createdAt: new Date(now.getTime() - i * 60000),
      });
    }
    await testDb.logs.bulkAdd(dummyLogs);

    reportService = new ReportService(testDb);
  });

  it('fetches page 1 of logs with accurate pagination metadata', async () => {
    const result = await reportService.getPaginatedLogs('all', undefined, 1, 10);

    expect(result.logs.length).toBe(10);
    expect(result.totalCount).toBe(30);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.logs[0].id).toBe(1); // newest timestamp first (reverse createdAt)
  });

  it('filters logs by system category successfully', async () => {
    const result = await reportService.getPaginatedLogs('system', undefined, 1, 10);

    // 30 / 5 = 6 system logs
    expect(result.totalCount).toBe(6);
    expect(result.logs.every((l) => l.type === 'system')).toBe(true);
  });

  it('serves repeat log requests instantly from in-memory cache', async () => {
    const result1 = await reportService.getPaginatedLogs('all', undefined, 1, 10);

    // Spy on database.logs.orderBy
    const orderBySpy = vi.spyOn(testDb.logs, 'orderBy');

    const result2 = await reportService.getPaginatedLogs('all', undefined, 1, 10);

    // Exact cached object returned without DB collection query
    expect(result2).toBe(result1);
    expect(orderBySpy).not.toHaveBeenCalled();

    orderBySpy.mockRestore();
  });

  it('prefetches page 2 of logs in background when page 1 is accessed', async () => {
    await reportService.getPaginatedLogs('all', undefined, 1, 10);

    // Wait for background prefetch microtask
    await new Promise((resolve) => setTimeout(resolve, 50));

    const orderBySpy = vi.spyOn(testDb.logs, 'orderBy');
    const resultPage2 = await reportService.getPaginatedLogs('all', undefined, 2, 10);

    expect(resultPage2.currentPage).toBe(2);
    expect(resultPage2.logs.length).toBe(10);
    // Page 2 was served from prefetch cache without re-querying collection!
    expect(orderBySpy).not.toHaveBeenCalled();

    orderBySpy.mockRestore();
  });

  it('clears log pagination cache when clearLogPaginationCache is invoked', async () => {
    await reportService.getPaginatedLogs('all', undefined, 1, 10);

    reportService.clearLogPaginationCache();

    const orderBySpy = vi.spyOn(testDb.logs, 'orderBy');
    await reportService.getPaginatedLogs('all', undefined, 1, 10);

    // Had to re-query because cache was cleared
    expect(orderBySpy).toHaveBeenCalled();
    orderBySpy.mockRestore();
  });

  it('supports date range filtering with startDate and endDate objects', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 15 * 60000); // last 15 minutes
    const end = now;

    const result = await reportService.getPaginatedLogs('all', start, end, 1, 10);
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.logs.length).toBeLessThanOrEqual(10);
    expect(result.logs.every((l) => l.createdAt >= start && l.createdAt <= end)).toBe(true);
  });
});

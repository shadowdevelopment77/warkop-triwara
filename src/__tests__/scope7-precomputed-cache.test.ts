import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';

describe('Pre-Computed Analytics & Query Cache Tests', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    reportService = new ReportService(testDb);

    await testDb.orders.clear();
    await testDb.dailySummaries.clear();
    reportService.invalidateCache();
  });

  it('Pre-computed dailySummaries are read directly by getSalesChartData for daily mode', async () => {
    // Populate 10 days of pre-computed dailySummaries
    const summaries = [];
    for (let i = 1; i <= 10; i++) {
      summaries.push({
        date: `2026-08-${String(i).padStart(2, '0')}`,
        totalOmset: 100000 * i,
        totalProfit: 60000 * i,
        totalCash: 70000 * i,
        totalQris: 30000 * i,
        completedCount: 10 * i,
        voidedCount: 0,
        totalItemsSold: 15 * i,
        topProductName: 'Kopi Susu Aren',
        topProductPercentage: 70,
        productSales: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await testDb.dailySummaries.bulkAdd(summaries);

    const start = new Date('2026-08-01T00:00:00');
    const end = new Date('2026-08-10T23:59:59');

    const chartRes = await reportService.getSalesChartData(start, end);

    expect(chartRes.mode).toBe('daily');
    expect(chartRes.points.length).toBe(10);
    expect(chartRes.points[0].omset).toBe(100000);
    expect(chartRes.points[9].omset).toBe(1000000);
  });

  it('getReportBundle caches report bundle and serves second call from memory cache in 0ms', async () => {
    const start = new Date('2026-08-01T00:00:00');
    const end = new Date('2026-08-05T23:59:59');

    // First call computes
    const t0 = performance.now();
    const bundle1 = await reportService.getReportBundle(start, end);
    const duration1 = performance.now() - t0;

    expect(bundle1).toBeDefined();
    expect(bundle1.summary).toBeDefined();
    expect(bundle1.chart).toBeDefined();

    // Second call serves from cache
    const t1 = performance.now();
    const bundle2 = await reportService.getReportBundle(start, end);
    const duration2 = performance.now() - t1;

    expect(bundle2).toBe(bundle1); // Same reference in memory!
    expect(duration2).toBeLessThanOrEqual(duration1);
  });

  it('invalidateCache clears the memory cache cleanly', async () => {
    const start = new Date('2026-08-01T00:00:00');
    const end = new Date('2026-08-05T23:59:59');

    const bundle1 = await reportService.getReportBundle(start, end);
    reportService.invalidateCache();
    const bundle2 = await reportService.getReportBundle(start, end);

    // After invalidation, a fresh bundle is computed
    expect(bundle1).not.toBe(bundle2);
    expect(bundle1.summary.totalOmset).toBe(bundle2.summary.totalOmset);
  });
});

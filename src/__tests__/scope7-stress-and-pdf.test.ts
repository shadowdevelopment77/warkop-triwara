import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { StressTestService } from '../services/stress-test.service';

describe('Scope 7: Stress Test Generator, Benchmarking & Chunked Export Tests', () => {
  let testDb: TriwaraDatabase;
  let stressService: StressTestService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    stressService = new StressTestService(testDb);

    await testDb.orders.clear();
    await testDb.dailySummaries.clear();
  });

  it('Generates dummy transactions in async chunks and updates daily rollup summaries concurrently', async () => {
    const progressReports: number[] = [];

    const { durationMs, totalCreated } = await stressService.generateDummyOrders(1000, (p) => {
      progressReports.push(p.percent);
    });

    expect(totalCreated).toBe(1000);
    expect(durationMs).toBeGreaterThan(0);
    expect(progressReports.length).toBeGreaterThan(0);
    expect(progressReports[progressReports.length - 1]).toBe(100);

    // Verify orders persisted
    const count = await testDb.orders.count();
    expect(count).toBe(1000);

    // Verify daily rollup summaries created
    const summariesCount = await testDb.dailySummaries.count();
    expect(summariesCount).toBeGreaterThan(0);
  });

  it('Runs performance benchmarks measuring latency and storage', async () => {
    // Populate with 500 dummy records
    await stressService.generateDummyOrders(500);

    const benchmark = await stressService.runBenchmarks();

    expect(benchmark.totalOrders).toBe(500);
    expect(typeof benchmark.paginationLatencyMs).toBe('number');
    expect(typeof benchmark.reportLatencyMs).toBe('number');
  });

  it('Cleans dummy orders completely without affecting real store data', async () => {
    // 1. Add 1 real order
    await testDb.orders.add({
      orderNumber: 'TRW-REAL-001',
      sequenceNumber: 1,
      customerName: 'Real Customer',
      items: [],
      subtotal: 20000,
      discountPercent: 0,
      discountAmount: 0,
      total: 20000,
      hppTotal: 8000,
      profit: 12000,
      paymentMethod: 'cash',
      paymentAmount: 20000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date(),
    });

    // 2. Add 200 dummy orders
    await stressService.generateDummyOrders(200);
    expect(await testDb.orders.count()).toBe(201);

    // 3. Clean dummy orders
    const deletedCount = await stressService.cleanDummyOrders();
    expect(deletedCount).toBe(200);

    // 4. Verify only the real order remains
    expect(await testDb.orders.count()).toBe(1);
    const remaining = await testDb.orders.toCollection().first();
    expect(remaining?.orderNumber).toBe('TRW-REAL-001');
  });
});

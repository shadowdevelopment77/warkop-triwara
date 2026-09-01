// ═══════════════════════════════════════════════
// Paginated Orders Performance & Prefetch Cache Tests
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { OrderService } from '../services/order.service';
import type { IOrder } from '../types';

describe('Paginated Orders Performance & LRU Prefetch Cache Tests', () => {
  let testDb: TriwaraDatabase;
  let orderService: OrderService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_page_perf_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.orders.clear();
    await testDb.shifts.clear();
    await testDb.logs.clear();

    // Populate 25 test orders
    const now = new Date();
    const dummyOrders: IOrder[] = [];
    for (let i = 1; i <= 25; i++) {
      dummyOrders.push({
        id: i,
        orderNumber: `TRW-TEST-${String(i).padStart(3, '0')}`,
        sequenceNumber: i,
        customerName: `Pelanggan ${i}`,
        processedBy: 'Kasir Test',
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
        createdAt: new Date(now.getTime() - i * 60000), // staggered by 1 minute
      });
    }
    await testDb.orders.bulkAdd(dummyOrders);

    orderService = new OrderService(testDb);
  });

  it('fetches page 1 with accurate pagination metadata', async () => {
    const today = new Date();
    const result = await orderService.getPaginatedOrders(today, today, 1, 10);

    expect(result.orders.length).toBe(10);
    expect(result.totalCount).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.orders[0].sequenceNumber).toBe(1); // newest first (reverse)
  });

  it('serves repeat page requests instantly from in-memory cache', async () => {
    const today = new Date();
    const result1 = await orderService.getPaginatedOrders(today, today, 1, 10);

    // Spy on database.orders.where
    const whereSpy = vi.spyOn(testDb.orders, 'where');

    const result2 = await orderService.getPaginatedOrders(today, today, 1, 10);

    // Identical object returned from cache, no DB range query called
    expect(result2).toBe(result1);
    expect(whereSpy).not.toHaveBeenCalled();

    whereSpy.mockRestore();
  });

  it('prefetches page 2 in background when page 1 is accessed', async () => {
    const today = new Date();
    await orderService.getPaginatedOrders(today, today, 1, 10);

    // Wait for background prefetch microtask (10ms setTimeout in prefetchNextPage)
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Access page 2
    const whereSpy = vi.spyOn(testDb.orders, 'where');
    const resultPage2 = await orderService.getPaginatedOrders(today, today, 2, 10);

    expect(resultPage2.currentPage).toBe(2);
    expect(resultPage2.orders.length).toBe(10);
    // Page 2 was served from prefetch cache without re-querying range!
    expect(whereSpy).not.toHaveBeenCalled();

    whereSpy.mockRestore();
  });

  it('clears pagination cache when clearPaginationCache is invoked', async () => {
    const today = new Date();
    await orderService.getPaginatedOrders(today, today, 1, 10);

    orderService.clearPaginationCache();

    const whereSpy = vi.spyOn(testDb.orders, 'where');
    await orderService.getPaginatedOrders(today, today, 1, 10);

    // Had to re-query because cache was cleared
    expect(whereSpy).toHaveBeenCalled();
    whereSpy.mockRestore();
  });
});

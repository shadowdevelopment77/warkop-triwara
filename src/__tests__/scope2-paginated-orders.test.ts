import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { OrderService } from '../services/order.service';
import { HppService } from '../services/hpp.service';
import type { IOrder } from '../types';

describe('Scope 2: Paginated Transactions & Database B-Tree Queries', () => {
  let testDb: TriwaraDatabase;
  let orderService: OrderService;
  let hppService: HppService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    hppService = new HppService(testDb);
    orderService = new OrderService(testDb, hppService);

    await testDb.orders.clear();
  });

  it('Paginates 25 transactions cleanly at the database level with offset and limit', async () => {
    const baseTime = new Date('2026-08-31T08:00:00').getTime();

    // Create 25 mock orders (1 to 25)
    for (let i = 1; i <= 25; i++) {
      await testDb.orders.add({
        orderNumber: `TRW-20260831-${String(i).padStart(3, '0')}`,
        sequenceNumber: i,
        customerName: `Pelanggan ${i}`,
        items: [],
        subtotal: i * 10000,
        discountPercent: 0,
        discountAmount: 0,
        total: i * 10000,
        hppTotal: i * 4000,
        profit: i * 6000,
        paymentMethod: i % 2 === 0 ? 'qris' : 'cash',
        paymentAmount: i * 10000,
        changeAmount: 0,
        status: 'completed',
        createdAt: new Date(baseTime + i * 60000), // 1 min apart
      } as unknown as IOrder);
    }

    // Page 1: Should return 10 newest orders (Order 25 down to 16)
    const page1 = await orderService.getPaginatedOrders(undefined, undefined, 1, 10);
    expect(page1.totalCount).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.currentPage).toBe(1);
    expect(page1.orders).toHaveLength(10);
    expect(page1.orders[0].sequenceNumber).toBe(25);
    expect(page1.orders[9].sequenceNumber).toBe(16);

    // Page 2: Should return next 10 orders (Order 15 down to 6)
    const page2 = await orderService.getPaginatedOrders(undefined, undefined, 2, 10);
    expect(page2.totalCount).toBe(25);
    expect(page2.currentPage).toBe(2);
    expect(page2.orders).toHaveLength(10);
    expect(page2.orders[0].sequenceNumber).toBe(15);
    expect(page2.orders[9].sequenceNumber).toBe(6);

    // Page 3: Should return remaining 5 orders (Order 5 down to 1)
    const page3 = await orderService.getPaginatedOrders(undefined, undefined, 3, 10);
    expect(page3.totalCount).toBe(25);
    expect(page3.currentPage).toBe(3);
    expect(page3.orders).toHaveLength(5);
    expect(page3.orders[0].sequenceNumber).toBe(5);
    expect(page3.orders[4].sequenceNumber).toBe(1);
  });

  it('Applies date range B-Tree index filtering before paginating', async () => {
    // 5 orders on Aug 29
    for (let i = 1; i <= 5; i++) {
      await testDb.orders.add({
        orderNumber: `TRW-20260829-${String(i).padStart(3, '0')}`,
        sequenceNumber: i,
        customerName: `Agustus 29 - #${i}`,
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
        createdAt: new Date('2026-08-29T12:00:00'),
      } as unknown as IOrder);
    }

    // 15 orders on Aug 30
    for (let i = 1; i <= 15; i++) {
      await testDb.orders.add({
        orderNumber: `TRW-20260830-${String(i).padStart(3, '0')}`,
        sequenceNumber: i,
        customerName: `Agustus 30 - #${i}`,
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
        createdAt: new Date('2026-08-30T12:00:00'),
      } as unknown as IOrder);
    }

    // Query specifically for Aug 30: Should count only 15 orders
    const aug30 = new Date('2026-08-30T10:00:00');
    const result = await orderService.getPaginatedOrders(aug30, aug30, 1, 10);

    expect(result.totalCount).toBe(15);
    expect(result.totalPages).toBe(2);
    expect(result.orders).toHaveLength(10);
    expect(result.orders[0].orderNumber).toContain('TRW-20260830');
  });

  it('generateOrderNumber accurately counts existing orders using index without loading full array', async () => {
    // Add 3 orders today
    for (let i = 1; i <= 3; i++) {
      await testDb.orders.add({
        orderNumber: `TRW-TODAY-${i}`,
        sequenceNumber: i,
        customerName: `User ${i}`,
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
      } as unknown as IOrder);
    }

    const { sequenceNumber, orderNumber } = await orderService.generateOrderNumber();
    expect(sequenceNumber).toBe(4);
    expect(orderNumber).toContain('-004');
  });

  it('getOrders supports optional limit with indexed ordering', async () => {
    for (let i = 1; i <= 10; i++) {
      await testDb.orders.add({
        orderNumber: `TRW-TEST-${i}`,
        sequenceNumber: i,
        customerName: `User ${i}`,
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
        createdAt: new Date(Date.now() + i * 1000),
      } as unknown as IOrder);
    }

    const limited = await orderService.getOrders(undefined, undefined, 3);
    expect(limited).toHaveLength(3);
    expect(limited[0].sequenceNumber).toBe(10); // newest first
  });
});

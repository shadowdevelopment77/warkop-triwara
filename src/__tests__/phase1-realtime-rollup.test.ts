// ═══════════════════════════════════════════════
// Phase 1 Unit Tests: Real-Time Daily Summary Rollup
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';
import { OrderService } from '../services/order.service';
import { HppService } from '../services/hpp.service';
import { toInputDateString } from '../utils/date';
import type { ICartItem, IProduct, IIngredient } from '../types';

describe('Phase 1: Real-Time Daily Summary Rollup & Zero-Scan Analytics', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;
  let orderService: OrderService;
  let hppService: HppService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_phase1_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.orders.clear();
    await testDb.shifts.clear();
    await testDb.dailySummaries.clear();
    await testDb.products.clear();
    await testDb.ingredients.clear();

    hppService = new HppService(testDb);
    reportService = new ReportService(testDb);
    orderService = new OrderService(testDb, hppService);

    // Setup base ingredient and product
    await testDb.ingredients.add({
      id: 1,
      name: 'Biji Kopi House Blend',
      sku: 'ING-001',
      category: 'coffee_beans',
      stock: 5000,
      minStockAlert: 500,
      costPerUnit: 150,
      unit: 'gr',
      updatedAt: new Date(),
    } as unknown as IIngredient);

    await testDb.products.add({
      id: 1,
      name: 'Es Kopi Susu',
      basePrice: 18000,
      price: 18000,
      category: 'Coffee',
      categoryId: 1,
      active: true,
      isActive: true,
      recipe: [{ ingredientId: 1, amount: 15, unit: 'gr' }],
      takeawayPackaging: [],
      availableAdditionals: [],
    } as unknown as IProduct);

    await testDb.products.add({
      id: 2,
      name: 'Americano',
      basePrice: 15000,
      price: 15000,
      category: 'Coffee',
      categoryId: 1,
      active: true,
      isActive: true,
      recipe: [{ ingredientId: 1, amount: 10, unit: 'gr' }],
      takeawayPackaging: [],
      availableAdditionals: [],
    } as unknown as IProduct);
  });

  it('automatically increments dailySummaries table when an order is created', async () => {
    const product = await testDb.products.get(1);
    expect(product).toBeDefined();

    const cart = [
      {
        product: product!,
        quantity: 2,
        orderType: 'dine_in',
        itemPrice: 18000,
        extraToppings: [],
      },
    ] as unknown as ICartItem[];

    const { order } = await orderService.createOrder(cart, 'Budi', 0, 'cash', 50000, 'Kasir 1');
    expect(order.total).toBe(36000);

    const todayKey = toInputDateString(new Date());
    const summary = await testDb.dailySummaries.where('date').equals(todayKey).first();

    expect(summary).toBeDefined();
    expect(summary!.totalOmset).toBe(36000);
    expect(summary!.totalCash).toBe(36000);
    expect(summary!.totalQris).toBe(0);
    expect(summary!.completedCount).toBe(1);
    expect(summary!.totalItemsSold).toBe(2);
    expect(summary!.topProductName).toBe('Es Kopi Susu');
    expect(summary!.topProductPercentage).toBe(100);
  });

  it('accumulates multiple orders and recalculates top products in dailySummaries', async () => {
    const p1 = (await testDb.products.get(1))!;
    const p2 = (await testDb.products.get(2))!;

    // Order 1: 1x Es Kopi Susu
    await orderService.createOrder(
      [{ product: p1, quantity: 1, orderType: 'dine_in', itemPrice: 18000, extraToppings: [] }] as unknown as ICartItem[],
      'User 1', 0, 'cash', 20000
    );

    // Order 2: 3x Americano via QRIS
    await orderService.createOrder(
      [{ product: p2, quantity: 3, orderType: 'takeaway', itemPrice: 15000, extraToppings: [] }] as unknown as ICartItem[],
      'User 2', 0, 'qris', 45000
    );

    const todayKey = toInputDateString(new Date());
    const summary = await testDb.dailySummaries.where('date').equals(todayKey).first();

    expect(summary).toBeDefined();
    expect(summary!.totalOmset).toBe(18000 + 45000);
    expect(summary!.totalCash).toBe(18000);
    expect(summary!.totalQris).toBe(45000);
    expect(summary!.completedCount).toBe(2);
    expect(summary!.totalItemsSold).toBe(4); // 1 + 3
    expect(summary!.topProductName).toBe('Americano'); // 3 sold > 1 sold
    expect(summary!.topProductPercentage).toBe(75); // 3 / 4 = 75%
  });

  it('automatically decrements dailySummaries when an order is voided', async () => {
    const p1 = (await testDb.products.get(1))!;
    const { order } = await orderService.createOrder(
      [{ product: p1, quantity: 2, orderType: 'dine_in', itemPrice: 18000, extraToppings: [] }] as unknown as ICartItem[],
      'User Void', 0, 'cash', 50000
    );

    const todayKey = toInputDateString(new Date());
    let summary = await testDb.dailySummaries.where('date').equals(todayKey).first();
    expect(summary!.totalOmset).toBe(36000);
    expect(summary!.completedCount).toBe(1);

    // Void the order
    await orderService.voidOrder(order.id!, 'Pelanggan membatalkan pesanan');

    summary = await testDb.dailySummaries.where('date').equals(todayKey).first();
    expect(summary!.totalOmset).toBe(0);
    expect(summary!.totalCash).toBe(0);
    expect(summary!.completedCount).toBe(0);
    expect(summary!.voidedCount).toBe(1);
    expect(summary!.totalItemsSold).toBe(0);
  });

  it('getSalesSummary reads directly from dailySummaries without scanning orders table', async () => {
    const todayKey = toInputDateString(new Date());
    await testDb.dailySummaries.add({
      date: todayKey,
      totalOmset: 500000,
      totalProfit: 300000,
      totalCash: 300000,
      totalQris: 200000,
      completedCount: 25,
      voidedCount: 0,
      totalItemsSold: 35,
      topProductName: 'Es Kopi Susu',
      topProductPercentage: 60,
      productSales: {
        '1': { productId: 1, productName: 'Es Kopi Susu', quantitySold: 21, totalRevenue: 378000 },
        '2': { productId: 2, productName: 'Americano', quantitySold: 14, totalRevenue: 122000 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const now = new Date();
    const summary = await reportService.getSalesSummary(now, now);

    expect(summary.totalOmset).toBe(500000);
    expect(summary.totalCash).toBe(300000);
    expect(summary.totalQris).toBe(200000);
    expect(summary.totalProfit).toBe(300000);
    expect(summary.completedCount).toBe(25);
    expect(summary.totalItemsSold).toBe(35);
    expect(summary.topProductName).toBe('Es Kopi Susu');
    expect(summary.topProductPercentage).toBe(60);
  });
});

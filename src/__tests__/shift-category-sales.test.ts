// ═══════════════════════════════════════════════
// Unit Tests: Shift Product Sales Grouped by Category & Thermal Receipt Format
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ShiftService, type IShiftCategorySales } from '../services/shift.service';
import { receiptService } from '../services/receipt.service';
import { pdfService } from '../services/pdf.service';
import type { IShift, IShopConfig, IOrder } from '../types';

describe('Shift Product Sales Grouped by Category & Receipt', () => {
  let testDb: TriwaraDatabase;
  let testShiftService: ShiftService;

  const mockConfig: IShopConfig = {
    appName: 'Warkop Triwara Test',
    receiptHeaderLines: ['Jl. Veteran No. 10'],
    receiptFooterLines: ['Terima Kasih'],
    pinHash: 'dummy',
  };

  const sampleShift: IShift = {
    id: 10,
    shiftNumber: 'SHF-20260912-001',
    cashierId: 1,
    cashierName: 'Ahmad',
    openedAt: new Date('2026-09-12T08:00:00'),
    closedAt: new Date('2026-09-12T16:00:00'),
    startingCash: 100000,
    totalCashSales: 91000,
    totalQrisSales: 0,
    totalTransactions: 2,
    totalVoided: 0,
    expectedEndingCash: 191000,
    actualEndingCash: 191000,
    cashDifference: 0,
    status: 'closed',
  };

  beforeEach(async () => {
    testDb = new TriwaraDatabase('TestShiftCategoryDB_' + Math.random());
    testShiftService = new ShiftService(testDb);

    await testDb.categories.clear();
    await testDb.products.clear();
    await testDb.orders.clear();

    // 1. Setup categories
    await testDb.categories.bulkAdd([
      { id: 1, name: 'Kopi', sortOrder: 1 },
      { id: 2, name: 'Snack', sortOrder: 2 },
    ]);

    // 2. Setup products
    await testDb.products.bulkAdd([
      {
        id: 101,
        categoryId: 1,
        name: 'Americano',
        price: 15000,
        description: '',
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 102,
        categoryId: 1,
        name: 'Kopi Susu Aren',
        price: 18000,
        description: '',
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 201,
        categoryId: 2,
        name: 'Kentang Goreng',
        price: 10000,
        description: '',
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it('aggregates completed orders into category-grouped product sales accurately', async () => {
    // 3. Add orders for shift 10
    const order1: IOrder = {
      orderNumber: 'TRW-1',
      sequenceNumber: 1,
      customerName: 'Budi',
      items: [
        {
          productId: 101,
          productName: 'Americano',
          price: 15000,
          hpp: 5000,
          qty: 2,
          orderType: 'dine_in',
          subtotal: 30000,
          hppSubtotal: 10000,
          toppings: [],
          notes: '',
        },
        {
          productId: 201,
          productName: 'Kentang Goreng',
          price: 10000,
          hpp: 4000,
          qty: 1,
          orderType: 'dine_in',
          subtotal: 10000,
          hppSubtotal: 4000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 40000,
      discountPercent: 0,
      discountAmount: 0,
      total: 40000,
      hppTotal: 14000,
      profit: 26000,
      paymentMethod: 'cash',
      paymentAmount: 40000,
      changeAmount: 0,
      status: 'completed',
      shiftId: 10,
      createdAt: new Date(),
    };

    const order2: IOrder = {
      orderNumber: 'TRW-2',
      sequenceNumber: 2,
      customerName: 'Siti',
      items: [
        {
          productId: 101,
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
          productId: 102,
          productName: 'Kopi Susu Aren',
          price: 18000,
          hpp: 6000,
          qty: 2,
          orderType: 'takeaway',
          subtotal: 36000,
          hppSubtotal: 12000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 51000,
      discountPercent: 0,
      discountAmount: 0,
      total: 51000,
      hppTotal: 17000,
      profit: 34000,
      paymentMethod: 'cash',
      paymentAmount: 60000,
      changeAmount: 9000,
      status: 'completed',
      shiftId: 10,
      createdAt: new Date(),
    };

    await testDb.orders.bulkAdd([order1, order2]);

    const result = await testShiftService.getShiftProductSalesByCategory(10);

    expect(result).toHaveLength(2);

    // Kategori 1: Kopi
    const coffeeCat = result.find((c) => c.categoryName === 'Kopi');
    expect(coffeeCat).toBeDefined();
    expect(coffeeCat!.totalQty).toBe(5); // 3 Americano + 2 Kopi Susu
    expect(coffeeCat!.totalRevenue).toBe(81000); // 45k + 36k
    expect(coffeeCat!.items).toHaveLength(2);
    expect(coffeeCat!.items[0].productName).toBe('Americano');
    expect(coffeeCat!.items[0].quantitySold).toBe(3);
    expect(coffeeCat!.items[0].totalRevenue).toBe(45000);

    // Kategori 2: Snack
    const snackCat = result.find((c) => c.categoryName === 'Snack');
    expect(snackCat).toBeDefined();
    expect(snackCat!.totalQty).toBe(1);
    expect(snackCat!.totalRevenue).toBe(10000);
    expect(snackCat!.items[0].productName).toBe('Kentang Goreng');
  });

  it('generates 58mm thermal receipt text with category sections, items, and total count', () => {
    const mockCategorySales: IShiftCategorySales[] = [
      {
        categoryId: 1,
        categoryName: 'Kopi',
        totalQty: 5,
        totalRevenue: 81000,
        items: [
          { productName: 'Americano', quantitySold: 3, totalRevenue: 45000 },
          { productName: 'Kopi Susu Aren', quantitySold: 2, totalRevenue: 36000 },
        ],
      },
      {
        categoryId: 2,
        categoryName: 'Snack',
        totalQty: 1,
        totalRevenue: 10000,
        items: [{ productName: 'Kentang Goreng', quantitySold: 1, totalRevenue: 10000 }],
      },
    ];

    const text = receiptService.generateShiftReceiptText(sampleShift, mockConfig, mockCategorySales);

    expect(text).toContain('REKAP SHIFT KASIR');
    expect(text).toContain('PRODUK TERJUAL PER KATEGORI:');
    expect(text).toContain('[KOPI]');
    expect(text).toContain('Americano');
    expect(text).toContain('x3');
    expect(text).toContain('[SNACK]');
    expect(text).toContain('Kentang Goreng');
    expect(text).toContain('Total Produk Terjual:');
    expect(text).toContain('6 Item');
    expect(text).toContain('Tanda Tangan Kasir');
  });

  it('exports shift report PDF with category-grouped product table successfully', async () => {
    const mockCategorySales: IShiftCategorySales[] = [
      {
        categoryId: 1,
        categoryName: 'Kopi',
        totalQty: 3,
        totalRevenue: 45000,
        items: [{ productName: 'Americano', quantitySold: 3, totalRevenue: 45000 }],
      },
    ];

    await expect(
      pdfService.exportShiftReportPdf(sampleShift, mockConfig, mockCategorySales)
    ).resolves.not.toThrow();
  });
});

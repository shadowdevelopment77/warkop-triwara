import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ProductService } from '../services/product.service';
import { IngredientService } from '../services/ingredient.service';
import { ReceiptService } from '../services/receipt.service';
import type { IOrder, IShopConfig } from '../types';

describe('Sprint 4 Feature Tests', () => {
  let testDb: TriwaraDatabase;
  let productService: ProductService;
  let ingredientService: IngredientService;
  let receiptService: ReceiptService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    productService = new ProductService(testDb);
    ingredientService = new IngredientService(testDb);
    receiptService = new ReceiptService();

    await testDb.products.clear();
    await testDb.ingredients.clear();
    await testDb.shopConfig.clear();
  });

  it('deduplicates products with identical names automatically', async () => {
    // Manually insert duplicate products (simulating race-condition)
    await testDb.products.bulkAdd([
      {
        categoryId: 1,
        name: 'Americano',
        price: 18000,
        description: 'First copy',
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        categoryId: 1,
        name: 'Americano',
        price: 18000,
        description: 'Duplicate copy',
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        categoryId: 1,
        name: 'Caffe Latte',
        price: 22000,
        description: 'Latte copy',
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await productService.getProducts();
    expect(result.length).toBe(2);
    expect(result.map((p) => p.name)).toEqual(['Americano', 'Caffe Latte']);
  });

  it('manages custom ingredient categories dynamically', async () => {
    await testDb.shopConfig.add({
      appName: 'Triwara POS',
      receiptHeaderLines: ['Header 1'],
      receiptFooterLines: ['Footer 1'],
      pinHash: 'test',
      customIngredientCategories: ['Syrup Flavour'],
    });

    await ingredientService.addCategory('Dairy & Milk');
    const categories = await ingredientService.getCategories();

    expect(categories).toContain('raw');
    expect(categories).toContain('packaging');
    expect(categories).toContain('Syrup Flavour');
    expect(categories).toContain('Dairy & Milk');
  });

  it('generates 3 thermal receipt formats properly', () => {
    const mockOrder: IOrder = {
      orderNumber: 'TRW-TEST-001',
      sequenceNumber: 1,
      customerName: 'Budi Santoso',
      items: [
        {
          productId: 1,
          productName: 'Kopi Susu Aren',
          qty: 2,
          price: 20000,
          hpp: 8000,
          subtotal: 40000,
          hppSubtotal: 16000,
          toppings: [{ name: 'Extra Shot Espresso', price: 5000, hppCost: 2000 }],
          notes: 'Less ice',
          orderType: 'dine_in',
        },
      ],
      subtotal: 45000,
      discountPercent: 10,
      discountAmount: 4500,
      total: 40500,
      hppTotal: 16000,
      profit: 24500,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 9500,
      status: 'completed',
      createdAt: new Date(),
    };

    const mockConfig: IShopConfig = {
      appName: 'Triwara POS',
      receiptHeaderLines: ['Warkop Triwara', 'Jl. Test 123'],
      receiptFooterLines: ['Terima Kasih', 'WiFi: Free'],
      pinHash: 'test',
    };

    const customerReceipt = receiptService.generateReceiptText(mockOrder, mockConfig, 'customer');
    expect(customerReceipt).toContain('TRW-TEST-001');
    expect(customerReceipt).toContain('Budi Santoso');
    expect(customerReceipt).toContain('Diskon (10%):');
    expect(customerReceipt).toContain('TOTAL:');

    const barReceipt = receiptService.generateReceiptText(mockOrder, mockConfig, 'bar');
    expect(barReceipt).toContain('ORDER BAR');
    expect(barReceipt).toContain('TOTAL BAR:');

    const kitchenReceipt = receiptService.generateReceiptText(mockOrder, mockConfig, 'kitchen');
    expect(kitchenReceipt).toContain('ORDER DAPUR');
    expect(kitchenReceipt).not.toContain('TOTAL:');
  });
});

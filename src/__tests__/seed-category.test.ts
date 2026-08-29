import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TriwaraDatabase } from '../database/db';
import { ProductService } from '../services/product.service';
import { resetAndSeedDatabase } from '../database/seed';

describe('Sprint 3: Dynamic Category & Seeder Tests', () => {
  let testDb: TriwaraDatabase;
  let productService: ProductService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    await testDb.open();
    await testDb.categories.clear();
    await testDb.products.clear();
    await testDb.ingredients.clear();
    await testDb.orders.clear();
    productService = new ProductService(testDb);
  });

  it('allows user to dynamically add a new category', async () => {
    const catId = await productService.addCategory('Camilan Sore');
    expect(catId).toBeGreaterThan(0);

    const categories = await productService.getCategories();
    expect(categories.some((c) => c.name === 'Camilan Sore')).toBe(true);
  });

  it('rejects duplicate or empty category names', async () => {
    await productService.addCategory('Minuman Boba');
    await expect(productService.addCategory('Minuman Boba')).rejects.toThrow('sudah ada');
    await expect(productService.addCategory('   ')).rejects.toThrow('tidak boleh kosong');
  });

  it('resets and seeds database with products, ingredients, and realistic orders', async () => {
    await resetAndSeedDatabase(testDb, 20);

    const catCount = await testDb.categories.count();
    const ingCount = await testDb.ingredients.count();
    const prodCount = await testDb.products.count();
    const orderCount = await testDb.orders.count();

    expect(catCount).toBeGreaterThanOrEqual(4);
    expect(ingCount).toBeGreaterThanOrEqual(10);
    expect(prodCount).toBeGreaterThanOrEqual(8);
    expect(orderCount).toBe(20);

    const firstOrder = await testDb.orders.toCollection().first();
    expect(firstOrder).toBeDefined();
    expect(firstOrder?.orderNumber).toMatch(/^TRW-\d{8}-\d{3}$/);
    expect(firstOrder?.total).toBeGreaterThan(0);
    expect(firstOrder?.items.length).toBeGreaterThan(0);
  });
});

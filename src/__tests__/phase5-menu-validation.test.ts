// ═══════════════════════════════════════════════
// Phase 5 Unit Tests: Strict Menu Form Validation
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ProductService } from '../services/product.service';
import type { IProduct } from '../types';

describe('Phase 5: Strict Menu & Recipe Validation', () => {
  let testDb: TriwaraDatabase;
  let productService: ProductService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_phase5_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.products.clear();
    await testDb.categories.clear();
    await testDb.logs.clear();

    productService = new ProductService(testDb);

    await testDb.categories.add({
      id: 1,
      name: 'Coffee',
      sortOrder: 1,
    });
  });

  const validProductData: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'> = {
    categoryId: 1,
    name: 'Caramel Macchiato',
    price: 28000,
    description: 'Espresso dengan sirup vanilla, steamed milk, dan caramel drizzle',
    isActive: true,
    recipe: [{ ingredientId: 1, amount: 18, unit: 'gr' }],
    takeawayPackaging: [{ ingredientId: 2, amount: 1, unit: 'pcs' }],
    availableAdditionals: [],
  };

  it('rejects adding product with empty name', async () => {
    await expect(
      productService.addProduct({
        ...validProductData,
        name: '   ',
      })
    ).rejects.toThrow('Nama menu tidak boleh kosong');
  });

  it('rejects adding product with invalid categoryId', async () => {
    await expect(
      productService.addProduct({
        ...validProductData,
        categoryId: 0,
      })
    ).rejects.toThrow('Kategori menu wajib dipilih');
  });

  it('rejects adding product with zero or negative price', async () => {
    await expect(
      productService.addProduct({
        ...validProductData,
        price: 0,
      })
    ).rejects.toThrow('Harga jual wajib diisi dan harus lebih dari Rp 0');
  });

  it('successfully creates product when all fields are completely filled', async () => {
    const id = await productService.addProduct(validProductData);
    expect(id).toBeDefined();

    const created = await productService.getProductById(id);
    expect(created).toBeDefined();
    expect(created!.name).toBe('Caramel Macchiato');
    expect(created!.price).toBe(28000);
    expect(created!.description).toBe('Espresso dengan sirup vanilla, steamed milk, dan caramel drizzle');
    expect(created!.recipe.length).toBe(1);
    expect(created!.takeawayPackaging.length).toBe(1);
  });
});

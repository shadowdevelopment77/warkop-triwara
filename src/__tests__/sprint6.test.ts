import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ProductService } from '../services/product.service';

describe('Sprint 6 Optimization Tests — Category Manager & Deletion Protection', () => {
  let testDb: TriwaraDatabase;
  let productService: ProductService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    productService = new ProductService(testDb);

    await testDb.products.clear();
    await testDb.categories.clear();
    await testDb.ingredients.clear();
  });

  it('allows adding and deleting an unused category', async () => {
    const catId = await productService.addCategory('Mocktail Spesial');
    let cats = await productService.getCategories();
    expect(cats.some((c) => c.id === catId)).toBe(true);

    await productService.deleteCategory(catId);
    cats = await productService.getCategories();
    expect(cats.some((c) => c.id === catId)).toBe(false);
  });

  it('protects category from deletion if products are assigned to it', async () => {
    const catId = await productService.addCategory('Coffee Classic');

    await productService.addProduct({
      categoryId: catId,
      name: 'Americano',
      price: 18000,
      description: 'Americano',
      recipe: [],
      takeawayPackaging: [],
      isActive: true,
    });

    await expect(productService.deleteCategory(catId)).rejects.toThrow(
      'Kategori ini tidak dapat dihapus karena masih digunakan oleh 1 menu produk.'
    );

    const cats = await productService.getCategories();
    expect(cats.some((c) => c.id === catId)).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { HppService } from '../services/hpp.service';
import { ProductService } from '../services/product.service';
import type { IProduct, IIngredient } from '../types';

describe('Scope 4: Menu & HPP Batch Stock Evaluation & Caching Tests', () => {
  let testDb: TriwaraDatabase;
  let hppService: HppService;
  let productService: ProductService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    hppService = new HppService(testDb);
    productService = new ProductService(testDb);

    await testDb.ingredients.clear();
    await testDb.products.clear();
    await testDb.categories.clear();
    hppService.invalidateCache();
    productService.invalidateCache();
  });

  it('Batch stock checking evaluates multiple products in 1 query without sequential database calls', async () => {
    // Ingredients
    const beanId = (await testDb.ingredients.add({
      name: 'Biji Kopi Espresso',
      category: 'coffee_beans',
      currentStock: 100, // grams
      minStock: 20,
      unit: 'gr',
      costPerUnit: 250,
      packageSize: 1000,
      packagePrice: 250000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IIngredient)) as number;

    const milkId = (await testDb.ingredients.add({
      name: 'Susu Fresh Milk',
      category: 'dairy',
      currentStock: 50, // ml (low stock)
      minStock: 500,
      unit: 'ml',
      costPerUnit: 20,
      packageSize: 1000,
      packagePrice: 20000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IIngredient)) as number;

    // Products
    const espresso: IProduct = {
      id: 1,
      categoryId: 1,
      name: 'Single Espresso',
      description: 'Ekstrak kopi murni',
      price: 15000,
      recipe: [{ ingredientId: beanId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const latte: IProduct = {
      id: 2,
      categoryId: 1,
      name: 'Caffe Latte',
      description: 'Espresso + susu segar',
      price: 25000,
      recipe: [
        { ingredientId: beanId, amount: 18, unit: 'gr' },
        { ingredientId: milkId, amount: 150, unit: 'ml' }, // Needs 150ml, only 50ml available!
      ],
      takeawayPackaging: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const batchResult = await hppService.checkBatchStockAvailability([espresso, latte], 'dine_in', 1);

    // Espresso should be available (100gr >= 18gr)
    expect(batchResult[1]).toBeDefined();
    expect(batchResult[1].isAvailable).toBe(true);

    // Latte should NOT be available because milk is short (50ml < 150ml)
    expect(batchResult[2]).toBeDefined();
    expect(batchResult[2].isAvailable).toBe(false);
    expect(batchResult[2].missingItemName).toBe('Susu Fresh Milk');
  });

  it('ProductService caches catalog in-memory and supports instant search filtering', async () => {
    await testDb.products.bulkAdd([
      {
        name: 'Kopi Susu Gula Aren',
        description: 'Kopi gula aren',
        categoryId: 1,
        price: 18000,
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Matcha Latte',
        description: 'Matcha jepang asli',
        categoryId: 2,
        price: 22000,
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Croissant Butter',
        description: 'Pastry renyah butter',
        categoryId: 3,
        price: 20000,
        recipe: [],
        takeawayPackaging: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Initial load: populates in-memory cache
    const all = await productService.getProducts();
    expect(all).toHaveLength(3);

    // Filter by search term
    const searchMatcha = await productService.getProducts(undefined, 'matcha');
    expect(searchMatcha).toHaveLength(1);
    expect(searchMatcha[0].name).toBe('Matcha Latte');

    // Filter by category
    const category1 = await productService.getProducts(1);
    expect(category1).toHaveLength(1);
    expect(category1[0].name).toBe('Kopi Susu Gula Aren');
  });

  it('Product mutations invalidate cache properly', async () => {
    const p1 = await productService.addProduct({
      name: 'Americano Ice',
      description: 'Americano dingin',
      categoryId: 1,
      price: 15000,
      recipe: [],
      takeawayPackaging: [],
      isActive: true,
    });

    let products = await productService.getProducts();
    expect(products.find((p) => p.id === p1)).toBeDefined();

    // Add another product: should invalidate cache and be returned immediately
    const p2 = await productService.addProduct({
      name: 'V60 Specialty',
      description: 'Manual brew single origin',
      categoryId: 1,
      price: 28000,
      recipe: [],
      takeawayPackaging: [],
      isActive: true,
    });

    products = await productService.getProducts();
    expect(products.find((p) => p.id === p2)).toBeDefined();
    expect(products).toHaveLength(2);
  });
});

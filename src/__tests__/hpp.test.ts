import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TriwaraDatabase } from '../database/db';
import { HppService } from '../services/hpp.service';
import type { IProduct } from '../types';

describe('HppService Logic & Stock Availability', () => {
  let testDb: TriwaraDatabase;
  let service: HppService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    await testDb.open();
    await testDb.ingredients.clear();
    await testDb.products.clear();
    service = new HppService(testDb);
  });

  it('calculates dine-in HPP without packaging correctly', async () => {
    // 1. Setup ingredients
    const beansId = (await testDb.ingredients.add({
      name: 'Biji Kopi Arabica',
      category: 'raw',
      unit: 'gr',
      currentStock: 1000,
      minStock: 100,
      costPerUnit: 200, // Rp200/gr
      purchasePackageName: 'Bag 1kg',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const cupId = (await testDb.ingredients.add({
      name: 'Paper Cup 8oz',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 100,
      minStock: 20,
      costPerUnit: 1500, // Rp1,500/pcs
      purchasePackageName: 'Sleeve 50pcs',
      purchasePrice: 75000,
      purchaseQuantity: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    // 2. Product: Americano (18gr beans, 1 cup takeaway packaging, price Rp20,000)
    const product: IProduct = {
      categoryId: 1,
      name: 'Americano',
      price: 20000,
      description: 'Espresso + air',
      recipe: [{ ingredientId: beansId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [{ ingredientId: cupId, amount: 1, unit: 'pcs' }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 3. Test Dine-in
    const dineInHpp = await service.calculateProductHpp(product, 'dine_in');
    // 18gr * 200 = 3600
    expect(dineInHpp.baseHpp).toBe(3600);
    expect(dineInHpp.packagingHpp).toBe(0);
    expect(dineInHpp.totalHpp).toBe(3600);
    expect(dineInHpp.grossProfit).toBe(16400); // 20000 - 3600
    expect(dineInHpp.marginPercent).toBe(82); // (16400 / 20000) * 100

    // 4. Test Takeaway
    const takeawayHpp = await service.calculateProductHpp(product, 'takeaway');
    // 3600 + 1500 = 5100
    expect(takeawayHpp.baseHpp).toBe(3600);
    expect(takeawayHpp.packagingHpp).toBe(1500);
    expect(takeawayHpp.totalHpp).toBe(5100);
    expect(takeawayHpp.grossProfit).toBe(14900); // 20000 - 5100
  });

  it('validates stock availability correctly (available vs out of stock)', async () => {
    const beansId = (await testDb.ingredients.add({
      name: 'Biji Kopi Arabica',
      category: 'raw',
      unit: 'gr',
      currentStock: 30, // only 30gr remaining
      minStock: 100,
      costPerUnit: 200,
      purchasePackageName: 'Bag 1kg',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const cupId = (await testDb.ingredients.add({
      name: 'Paper Cup',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 0, // Out of cups!
      minStock: 20,
      costPerUnit: 1500,
      purchasePackageName: 'Sleeve',
      purchasePrice: 75000,
      purchaseQuantity: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const product: IProduct = {
      categoryId: 1,
      name: 'Americano',
      price: 20000,
      description: 'Espresso',
      recipe: [{ ingredientId: beansId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [{ ingredientId: cupId, amount: 1, unit: 'pcs' }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1 portion dine-in needs 18gr (stock is 30gr) -> Available!
    const check1 = await service.checkStockAvailability(product, 'dine_in', 1);
    expect(check1.isAvailable).toBe(true);

    // 2 portions dine-in needs 36gr (stock is only 30gr) -> Unavailable!
    const check2 = await service.checkStockAvailability(product, 'dine_in', 2);
    expect(check2.isAvailable).toBe(false);
    expect(check2.missingItemName).toBe('Biji Kopi Arabica');

    // 1 portion takeaway needs 1 cup (cup stock is 0) -> Unavailable!
    const checkTakeaway = await service.checkStockAvailability(product, 'takeaway', 1);
    expect(checkTakeaway.isAvailable).toBe(false);
    expect(checkTakeaway.missingItemName).toContain('Paper Cup');
  });
});

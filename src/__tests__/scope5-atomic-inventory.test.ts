import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { HppService } from '../services/hpp.service';
import { IngredientService } from '../services/ingredient.service';
import type { IOrder, IProduct, IIngredient } from '../types';

describe('Scope 5: Atomic Inventory Transactions & Consistency Tests', () => {
  let testDb: TriwaraDatabase;
  let hppService: HppService;
  let ingredientService: IngredientService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    hppService = new HppService(testDb);
    ingredientService = new IngredientService(testDb);

    await testDb.ingredients.clear();
    await testDb.inventoryLogs.clear();
    await testDb.logs.clear();
    await testDb.products.clear();
    hppService.invalidateCache();
  });

  it('Deducts recipe, packaging, and toppings atomically in 1 transaction', async () => {
    // 1. Setup ingredients
    const beanId = (await testDb.ingredients.add({
      name: 'Biji Kopi House Blend',
      category: 'coffee_beans',
      currentStock: 1000, // 1000gr
      minStock: 200,
      unit: 'gr',
      costPerUnit: 250,
      packageSize: 1000,
      packagePrice: 250000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IIngredient)) as number;

    const cupId = (await testDb.ingredients.add({
      name: 'Paper Cup 8oz',
      category: 'packaging',
      currentStock: 50, // 50 pcs
      minStock: 10,
      unit: 'pcs',
      costPerUnit: 800,
      packageSize: 50,
      packagePrice: 40000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IIngredient)) as number;

    // 2. Setup product
    const prodId = (await testDb.products.add({
      name: 'Americano Takeaway',
      description: 'Espresso + air mineral',
      categoryId: 1,
      price: 18000,
      recipe: [{ ingredientId: beanId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [{ ingredientId: cupId, amount: 1, unit: 'pcs' }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IProduct)) as number;

    // 3. Mock Order (2x Americano Takeaway)
    const order: IOrder = {
      orderNumber: 'TRW-TEST-ATOM-01',
      sequenceNumber: 1,
      customerName: 'Dedi',
      items: [
        {
          productId: prodId,
          productName: 'Americano Takeaway',
          price: 18000,
          hpp: 5300,
          qty: 2,
          orderType: 'takeaway',
          subtotal: 36000,
          hppSubtotal: 10600,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 36000,
      discountPercent: 0,
      discountAmount: 0,
      total: 36000,
      hppTotal: 10600,
      profit: 25400,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 14000,
      status: 'completed',
      createdAt: new Date(),
    };

    // 4. Perform atomic deduction
    await hppService.deductInventoryForOrder(order);

    // 5. Verify balances:
    // Beans: 1000 - (18 * 2) = 964
    const updatedBean = await testDb.ingredients.get(beanId);
    expect(updatedBean?.currentStock).toBe(964);

    // Cups: 50 - (1 * 2) = 48
    const updatedCup = await testDb.ingredients.get(cupId);
    expect(updatedCup?.currentStock).toBe(48);

    // Verify inventory logs (2 entries created atomically)
    const invLogs = await testDb.inventoryLogs.toArray();
    expect(invLogs).toHaveLength(2);
    expect(invLogs.every((l) => l.type === 'sale')).toBe(true);
  });

  it('Restores inventory atomically when an order is voided', async () => {
    const milkId = (await testDb.ingredients.add({
      name: 'Fresh Milk',
      category: 'dairy',
      currentStock: 500, // 500ml
      minStock: 200,
      unit: 'ml',
      costPerUnit: 20,
      packageSize: 1000,
      packagePrice: 20000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IIngredient)) as number;

    const prodId = (await testDb.products.add({
      name: 'Warm Milk',
      description: 'Susu hangat',
      categoryId: 2,
      price: 12000,
      recipe: [{ ingredientId: milkId, amount: 200, unit: 'ml' }],
      takeawayPackaging: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IProduct)) as number;

    const order: IOrder = {
      orderNumber: 'TRW-VOID-ATOM-02',
      sequenceNumber: 2,
      customerName: 'Budi',
      items: [
        {
          productId: prodId,
          productName: 'Warm Milk',
          price: 12000,
          hpp: 4000,
          qty: 1,
          orderType: 'dine_in',
          subtotal: 12000,
          hppSubtotal: 4000,
          toppings: [],
          notes: '',
        },
      ],
      subtotal: 12000,
      discountPercent: 0,
      discountAmount: 0,
      total: 12000,
      hppTotal: 4000,
      profit: 8000,
      paymentMethod: 'cash',
      paymentAmount: 12000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date(),
    };

    // First deduct
    await hppService.deductInventoryForOrder(order);
    let milk = await testDb.ingredients.get(milkId);
    expect(milk?.currentStock).toBe(300); // 500 - 200

    // Then restore on void
    await hppService.restoreInventoryForOrder(order);
    milk = await testDb.ingredients.get(milkId);
    expect(milk?.currentStock).toBe(500); // restored back to 500!

    const voidLogs = await testDb.inventoryLogs.where('type').equals('void_return').toArray();
    expect(voidLogs).toHaveLength(1);
    expect(voidLogs[0].quantity).toBe(200);
  });

  it('Performs atomic restock with weighted average costing & log tracking', async () => {
    const teaId = (await testDb.ingredients.add({
      name: 'Teh Hitam Earl Grey',
      category: 'tea',
      currentStock: 200, // 200gr @ 300/gr = 60.000 total
      minStock: 50,
      unit: 'gr',
      costPerUnit: 300,
      packageSize: 500,
      packagePrice: 150000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IIngredient)) as number;

    // Restock +300gr with new batch price Rp 120.000 for 300gr (Rp 400/gr)
    // New total value = 60.000 + 120.000 = 180.000
    // New total stock = 500gr
    // New weighted costPerUnit = 180.000 / 500 = 360/gr
    await ingredientService.restockIngredient(teaId, 300, 120000, 300);

    const updated = await testDb.ingredients.get(teaId);
    expect(updated?.currentStock).toBe(500);
    expect(updated?.costPerUnit).toBe(360);

    // Verify inventory log and system log
    const invLog = await testDb.inventoryLogs.where('ingredientId').equals(teaId).first();
    expect(invLog?.type).toBe('restock');
    expect(invLog?.quantity).toBe(300);

    const sysLog = await testDb.logs.where('type').equals('restock').first();
    expect(sysLog?.description).toContain('Teh Hitam Earl Grey +300 gr');
  });
});

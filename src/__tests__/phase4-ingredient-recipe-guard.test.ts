// ═══════════════════════════════════════════════
// Phase 4 Unit Tests: Ingredient Detail Lock, Custom Units & Recipe Guard
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { IngredientService } from '../services/ingredient.service';
import type { IProduct } from '../types';

describe('Phase 4: Bahan Baku & Resep Deletion Guard', () => {
  let testDb: TriwaraDatabase;
  let ingredientService: IngredientService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_phase4_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.ingredients.clear();
    await testDb.products.clear();
    await testDb.logs.clear();
    await testDb.inventoryLogs.clear();

    ingredientService = new IngredientService(testDb);
  });

  it('allows adding ingredient with custom string unit (e.g. sachet, botol, pack)', async () => {
    const id = await ingredientService.addIngredient({
      name: 'Sirup Karamel Monin',
      category: 'raw',
      unit: 'botol',
      currentStock: 5,
      minStock: 2,
      purchasePackageName: 'Dus 6 Botol',
      purchasePrice: 600000,
      purchaseQuantity: 6,
    });

    const saved = await ingredientService.getById(id);
    expect(saved).toBeDefined();
    expect(saved!.unit).toBe('botol');
    expect(saved!.costPerUnit).toBe(100000);
  });

  it('prevents deleting an ingredient if it is used in a product recipe', async () => {
    const ingId = await ingredientService.addIngredient({
      name: 'Espresso Blend',
      category: 'raw',
      unit: 'gr',
      currentStock: 1000,
      minStock: 200,
      purchasePackageName: 'Pouch 1kg',
      purchasePrice: 150000,
      purchaseQuantity: 1000,
    });

    // Add product that uses this ingredient
    await testDb.products.add({
      id: 10,
      name: 'Kopi Susu Gula Aren',
      basePrice: 20000,
      price: 20000,
      category: 'Coffee',
      categoryId: 1,
      active: true,
      isActive: true,
      recipe: [{ ingredientId: ingId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [],
      availableAdditionals: [],
    } as unknown as IProduct);

    // Check helper
    const usedIn = await ingredientService.getProductsUsingIngredient(ingId);
    expect(usedIn).toContain('Kopi Susu Gula Aren');

    // Attempt delete
    await expect(ingredientService.deleteIngredient(ingId)).rejects.toThrow(
      'Bahan ini tidak dapat dihapus karena masih digunakan pada menu'
    );
  });

  it('successfully deletes an ingredient if it is NOT used in any product recipes', async () => {
    const ingId = await ingredientService.addIngredient({
      name: 'Topping Biskuit Lotus',
      category: 'raw',
      unit: 'gr',
      currentStock: 500,
      minStock: 100,
      purchasePackageName: 'Pack 500gr',
      purchasePrice: 50000,
      purchaseQuantity: 500,
    });

    const usedIn = await ingredientService.getProductsUsingIngredient(ingId);
    expect(usedIn.length).toBe(0);

    await expect(ingredientService.deleteIngredient(ingId)).resolves.not.toThrow();
    const deleted = await ingredientService.getById(ingId);
    expect(deleted).toBeUndefined();
  });

  it('updates only minStock alert threshold without modifying original pricing or stock', async () => {
    const ingId = await ingredientService.addIngredient({
      name: 'Fresh Milk Greenfields',
      category: 'raw',
      unit: 'ml',
      currentStock: 5000,
      minStock: 1000,
      purchasePackageName: 'Karton 1 Liter',
      purchasePrice: 24000,
      purchaseQuantity: 1000,
    });

    // Detail mode: only minStock is updated
    await ingredientService.updateIngredient(ingId, {
      minStock: 1500,
    });

    const updated = await ingredientService.getById(ingId);
    expect(updated!.minStock).toBe(1500);
    expect(updated!.currentStock).toBe(5000);
    expect(updated!.costPerUnit).toBe(24);
    expect(updated!.name).toBe('Fresh Milk Greenfields');
  });

  it('does not reset weighted-average costPerUnit when only minStock is edited after a restock', async () => {
    const ingId = await ingredientService.addIngredient({
      name: 'Gula Aren',
      category: 'raw',
      unit: 'ml',
      currentStock: 1000,
      minStock: 200,
      purchasePackageName: 'Botol 1L',
      purchasePrice: 20000, // costPerUnit awal = 20
      purchaseQuantity: 1000,
    });

    // Restock dengan harga baru -> costPerUnit berubah jadi weighted average (bukan 20 lagi)
    await ingredientService.restockIngredient(ingId, 1000, 40000, 1000); // batch ini 40/ml
    const afterRestock = await ingredientService.getById(ingId);
    expect(afterRestock!.costPerUnit).toBe(30); // (1000*20 + 1000*40) / 2000 = 30

    // Sekarang cuma edit batas minimal alert, seperti yang user lakukan lewat modal "Detail Bahan"
    await ingredientService.updateIngredient(ingId, { minStock: 300 });

    const afterMinStockEdit = await ingredientService.getById(ingId);
    expect(afterMinStockEdit!.minStock).toBe(300);
    // costPerUnit HARUS tetap 30 (weighted average), bukan balik ke 20 (harga beli pertama)
    expect(afterMinStockEdit!.costPerUnit).toBe(30);
  });
});

import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TriwaraDatabase } from '../database/db';
import { IngredientService } from '../services/ingredient.service';

describe('IngredientService & Inventory Accounting', () => {
  let testDb: TriwaraDatabase;
  let service: IngredientService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    await testDb.open();
    await testDb.ingredients.clear();
    await testDb.products.clear();
    await testDb.inventoryLogs.clear();
    service = new IngredientService(testDb);
  });

  it('rejects duplicate ingredient names (case-insensitive)', async () => {
    await service.addIngredient({
      name: 'Fresh Milk',
      category: 'raw',
      unit: 'ml',
      currentStock: 1000,
      minStock: 200,
      purchasePackageName: 'Karton 1L',
      purchasePrice: 20000,
      purchaseQuantity: 1000,
    });

    // Attempt to add with different casing "fresh milk"
    await expect(
      service.addIngredient({
        name: '  fresh milk  ',
        category: 'raw',
        unit: 'ml',
        currentStock: 500,
        minStock: 100,
        purchasePackageName: 'Karton',
        purchasePrice: 20000,
        purchaseQuantity: 1000,
      })
    ).rejects.toThrow(/sudah terdaftar/i);
  });

  it('calculates weighted average cost (WAC) correctly on restock', async () => {
    // Initial batch: 1000gr @ Rp200/gr (Total val = Rp200,000)
    const id = await service.addIngredient({
      name: 'Biji Kopi Gayo',
      category: 'raw',
      unit: 'gr',
      currentStock: 1000,
      minStock: 200,
      purchasePackageName: 'Bag 1kg',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
    });

    const initial = await service.getById(id);
    expect(initial?.costPerUnit).toBe(200);

    // Restock with price inflation: +1000gr @ Rp300,000 (Rp300/gr)
    // New total value = (1000 * 200) + (1000 * 300) = 500,000
    // New total stock = 2000gr
    // Expected new weighted cost = 500,000 / 2000 = Rp250/gr
    await service.restockIngredient(id, 1000, 300000, 1000);

    const restocked = await service.getById(id);
    expect(restocked?.currentStock).toBe(2000);
    expect(restocked?.costPerUnit).toBe(250);

    // Verify audit log recorded
    const logs = await testDb.inventoryLogs.where('ingredientId').equals(id).toArray();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('restock');
    expect(logs[0].quantity).toBe(1000);
  });

  it('prevents deleting an ingredient if used in a product recipe', async () => {
    const ingId = await service.addIngredient({
      name: 'Espresso Roast',
      category: 'raw',
      unit: 'gr',
      currentStock: 500,
      minStock: 50,
      purchasePackageName: 'Pack',
      purchasePrice: 100000,
      purchaseQuantity: 500,
    });

    // Create a product that uses this ingredient
    await testDb.products.add({
      categoryId: 1,
      name: 'Espresso Single',
      codeBadge: 'ES',
      price: 15000,
      description: 'Single shot',
      recipe: [{ ingredientId: ingId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Attempt deletion
    await expect(service.deleteIngredient(ingId)).rejects.toThrow(
      /tidak dapat dihapus karena masih digunakan/i
    );
  });
});

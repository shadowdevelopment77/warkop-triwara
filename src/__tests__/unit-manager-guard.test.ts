// ═══════════════════════════════════════════════
// Unit Manager Tests: Add, Delete & In-Use Relational Guard
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { IngredientService } from '../services/ingredient.service';

describe('Unit Manager Feature & Deletion Guard Tests', () => {
  let testDb: TriwaraDatabase;
  let ingredientService: IngredientService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase(`test_unit_mgr_${Date.now()}_${Math.random()}`);
    await testDb.open();
    await testDb.ingredients.clear();
    await testDb.shopConfig.clear();
    await testDb.logs.clear();

    await testDb.shopConfig.add({
      id: 1,
      appName: 'Warkop Triwara Test',
      receiptHeaderLines: [],
      receiptFooterLines: [],
      pinHash: 'test',
      customUnits: [],
    });

    ingredientService = new IngredientService(testDb);
  });

  it('returns default baseline units (gr, ml, pcs)', async () => {
    const units = await ingredientService.getUnits();
    expect(units).toContain('gr');
    expect(units).toContain('ml');
    expect(units).toContain('pcs');
  });

  it('adds custom unit and persists in database', async () => {
    await ingredientService.addUnit('botol');
    const units = await ingredientService.getUnits();
    expect(units).toContain('botol');

    // Reject duplicate
    await expect(ingredientService.addUnit('botol')).rejects.toThrow('sudah terdaftar');
    await expect(ingredientService.addUnit('   ')).rejects.toThrow('tidak boleh kosong');
  });

  it('prevents deleting a baseline default system unit (gr, ml, pcs)', async () => {
    await expect(ingredientService.deleteUnit('gr')).rejects.toThrow(
      'Satuan sistem dasar "gr" tidak dapat dihapus'
    );
    await expect(ingredientService.deleteUnit('ml')).rejects.toThrow(
      'Satuan sistem dasar "ml" tidak dapat dihapus'
    );
    await expect(ingredientService.deleteUnit('pcs')).rejects.toThrow(
      'Satuan sistem dasar "pcs" tidak dapat dihapus'
    );
  });

  it('prevents deleting a custom unit if it is currently used by an ingredient', async () => {
    await ingredientService.addUnit('shot');

    // Add an ingredient using 'shot'
    await ingredientService.addIngredient({
      name: 'Single Espresso Shot Concentrate',
      category: 'raw',
      unit: 'shot',
      currentStock: 50,
      minStock: 10,
      purchasePackageName: 'Pack 50 Shot',
      purchasePrice: 100000,
      purchaseQuantity: 50,
    });

    // Attempt to delete 'shot'
    await expect(ingredientService.deleteUnit('shot')).rejects.toThrow(
      'tidak dapat dihapus karena masih digunakan oleh 1 bahan baku: Single Espresso Shot Concentrate'
    );

    // Ensure 'shot' is still in available units
    const units = await ingredientService.getUnits();
    expect(units).toContain('shot');
  });

  it('successfully deletes a custom unit if it is NOT used by any ingredients', async () => {
    await ingredientService.addUnit('sachet');
    let units = await ingredientService.getUnits();
    expect(units).toContain('sachet');

    // Delete unused unit
    await expect(ingredientService.deleteUnit('sachet')).resolves.not.toThrow();

    units = await ingredientService.getUnits();
    expect(units).not.toContain('sachet');

    // Audit log recorded
    const logs = await testDb.logs.where('type').equals('inventory').toArray();
    expect(logs.some((l) => l.description.includes('HAPUS SATUAN UKUR: sachet'))).toBe(true);
  });
});

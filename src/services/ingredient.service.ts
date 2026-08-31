// ═══════════════════════════════════════════════
// Triwara POS — Ingredient & Inventory Management Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IIngredient } from '../types';
import { hppService } from './hpp.service';

export class IngredientService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Gets all ingredients, optionally sorted by name A-Z or stock level */
  async getAll(sortBy: 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' = 'name_asc'): Promise<IIngredient[]> {
    const ingredients = await this.database.ingredients.toArray();

    return ingredients.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'stock_asc') return a.currentStock - b.currentStock;
      if (sortBy === 'stock_desc') return b.currentStock - a.currentStock;
      return 0;
    });
  }

  /** Gets a single ingredient by ID */
  async getById(id: number): Promise<IIngredient | undefined> {
    return this.database.ingredients.get(id);
  }

  /** Adds a new ingredient with duplicate name validation (case-insensitive) */
  async addIngredient(data: Omit<IIngredient, 'id' | 'createdAt' | 'updatedAt' | 'costPerUnit'>): Promise<number> {
    const normalizedName = data.name.trim().toLowerCase();
    const existing = await this.database.ingredients
      .filter((ing) => ing.name.trim().toLowerCase() === normalizedName)
      .first();

    if (existing) {
      throw new Error(`Bahan "${existing.name}" sudah terdaftar. Gunakan tombol "Tambah Stock" untuk menambah kuantitas.`);
    }

    const costPerUnit = data.purchaseQuantity > 0 ? data.purchasePrice / data.purchaseQuantity : 0;
    const now = new Date();

    const id = (await this.database.ingredients.add({
      ...data,
      name: data.name.trim(),
      costPerUnit: Math.round(costPerUnit * 100) / 100,
      createdAt: now,
      updatedAt: now,
    })) as number;

    hppService.invalidateCache();
    return id;
  }

  /** Performs Quick Restock with Weighted Average Costing (Atomic ACID Transaction) */
  async restockIngredient(
    id: number,
    addedQty: number,
    newPurchasePrice?: number,
    newPurchaseQty?: number
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.ingredients, this.database.inventoryLogs, this.database.logs],
      async () => {
        const ing = await this.database.ingredients.get(id);
        if (!ing) throw new Error('Bahan baku tidak ditemukan');

        let updatedCostPerUnit = ing.costPerUnit;

        if (newPurchasePrice && newPurchaseQty && newPurchaseQty > 0) {
          const batchCostPerUnit = newPurchasePrice / newPurchaseQty;
          const currentTotalValue = ing.currentStock * ing.costPerUnit;
          const addedTotalValue = addedQty * batchCostPerUnit;
          const newTotalStock = ing.currentStock + addedQty;

          updatedCostPerUnit = newTotalStock > 0 ? (currentTotalValue + addedTotalValue) / newTotalStock : batchCostPerUnit;
        }

        const newStock = ing.currentStock + addedQty;

        await this.database.ingredients.update(id, {
          currentStock: newStock,
          costPerUnit: Math.round(updatedCostPerUnit * 100) / 100,
          updatedAt: new Date(),
        });

        // Log restock activity
        await this.database.inventoryLogs.add({
          ingredientId: id,
          ingredientName: ing.name,
          type: 'restock',
          quantity: addedQty,
          note: `Restock +${addedQty} ${ing.unit}`,
          createdAt: new Date(),
        });

        await this.database.logs.add({
          type: 'restock',
          description: `RESTOCK ${ing.name} +${addedQty} ${ing.unit}`,
          referenceId: ing.name,
          createdAt: new Date(),
        });
      }
    );

    hppService.invalidateCache();
  }

  /** Edits ingredient details or stock opname correction */
  async updateIngredient(id: number, data: Partial<IIngredient>): Promise<void> {
    const ing = await this.database.ingredients.get(id);
    if (!ing) throw new Error('Bahan baku tidak ditemukan');

    if (data.name) {
      const normalizedName = data.name.trim().toLowerCase();
      const existing = await this.database.ingredients
        .filter((i) => i.id !== id && i.name.trim().toLowerCase() === normalizedName)
        .first();

      if (existing) {
        throw new Error(`Nama bahan "${existing.name}" sudah digunakan oleh item lain.`);
      }
    }

    let costPerUnit = ing.costPerUnit;
    const price = data.purchasePrice !== undefined ? data.purchasePrice : ing.purchasePrice;
    const qty = data.purchaseQuantity !== undefined ? data.purchaseQuantity : ing.purchaseQuantity;
    if (qty > 0) {
      costPerUnit = price / qty;
    }

    await this.database.ingredients.update(id, {
      ...data,
      name: data.name ? data.name.trim() : ing.name,
      costPerUnit: Math.round(costPerUnit * 100) / 100,
      updatedAt: new Date(),
    });

    hppService.invalidateCache();
  }

  /** Gets list of product names that use a specific ingredient in their recipe or packaging */
  async getProductsUsingIngredient(id: number): Promise<string[]> {
    const products = await this.database.products.toArray();
    const matching = products.filter(
      (p) =>
        (p.recipe && p.recipe.some((r) => r.ingredientId === id)) ||
        (p.takeawayPackaging && p.takeawayPackaging.some((pkg) => pkg.ingredientId === id)) ||
        (p.availableAdditionals && p.availableAdditionals.some((add) => add.ingredientId === id))
    );
    return matching.map((p) => p.name);
  }

  /** Deletes an ingredient after checking if used in any product recipes */
  async deleteIngredient(id: number): Promise<void> {
    const usedMenuNames = await this.getProductsUsingIngredient(id);

    if (usedMenuNames.length > 0) {
      throw new Error(
        `Bahan ini tidak dapat dihapus karena masih digunakan pada menu:\n• ${usedMenuNames.join('\n• ')}`
      );
    }

    await this.database.ingredients.delete(id);
    hppService.invalidateCache();
  }

  /** Gets all ingredient categories (default + custom) */
  async getCategories(): Promise<string[]> {
    const config = await this.database.shopConfig.toCollection().first();
    const custom = config?.customIngredientCategories || [];
    const fromIngs = (await this.database.ingredients.toArray()).map((i) => i.category);
    const set = new Set<string>(['raw', 'packaging', ...custom, ...fromIngs]);
    return Array.from(set);
  }

  /** Adds a new custom category for ingredients */
  async addCategory(categoryName: string): Promise<void> {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    const config = await this.database.shopConfig.toCollection().first();
    if (config && config.id) {
      const current = config.customIngredientCategories || [];
      if (!current.includes(trimmed)) {
        await this.database.shopConfig.update(config.id, {
          customIngredientCategories: [...current, trimmed],
        });
        await this.database.logs.add({
          type: 'inventory',
          description: `TAMBAH KATEGORI INVENTORI: ${trimmed}`,
          createdAt: new Date(),
        });
      }
    }
  }

  /** Deletes a custom category if not used by any ingredients */
  async deleteCategory(categoryName: string): Promise<void> {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    if (trimmed === 'raw' || trimmed === 'packaging') {
      throw new Error(`Kategori sistem "${trimmed === 'raw' ? 'Bahan Baku' : 'Kemasan'}" tidak dapat dihapus.`);
    }

    const ingredients = await this.database.ingredients.toArray();
    const usedCount = ingredients.filter((i) => i.category === trimmed).length;
    if (usedCount > 0) {
      throw new Error(`Kategori "${trimmed}" tidak dapat dihapus karena masih digunakan oleh ${usedCount} bahan baku.`);
    }

    const config = await this.database.shopConfig.toCollection().first();
    if (config && config.id) {
      const current = config.customIngredientCategories || [];
      const updated = current.filter((c) => c !== trimmed);
      await this.database.shopConfig.update(config.id, {
        customIngredientCategories: updated,
      });
      await this.database.logs.add({
        type: 'inventory',
        description: `HAPUS KATEGORI INVENTORI: ${trimmed}`,
        createdAt: new Date(),
      });
    }
  }
}

export const ingredientService = new IngredientService();

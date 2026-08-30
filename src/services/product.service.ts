// ═══════════════════════════════════════════════
// Triwara POS — Product Catalog & Recipe Builder Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IProduct, ICategory } from '../types';

export class ProductService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Gets all active categories */
  async getCategories(): Promise<ICategory[]> {
    return await this.database.categories.orderBy('sortOrder').toArray();
  }

  /** Adds a new product category */
  async addCategory(name: string): Promise<number> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Nama kategori tidak boleh kosong');
    }

    const existing = await this.database.categories
      .filter((c) => c.name.toLowerCase() === trimmed.toLowerCase())
      .first();

    if (existing) {
      throw new Error(`Kategori "${trimmed}" sudah ada`);
    }

    const count = await this.database.categories.count();
    const catId = (await this.database.categories.add({
      name: trimmed,
      sortOrder: count + 1,
    })) as number;

    await this.database.logs.add({
      type: 'menu',
      description: `TAMBAH KATEGORI MENU: ${trimmed}`,
      referenceId: String(catId),
      createdAt: new Date(),
    });

    return catId;
  }

  /** Deletes a product category if no products are assigned to it */
  async deleteCategory(id: number): Promise<void> {
    const cat = await this.database.categories.get(id);
    const assignedProducts = await this.database.products.where('categoryId').equals(id).count();
    if (assignedProducts > 0) {
      throw new Error(`Kategori ini tidak dapat dihapus karena masih digunakan oleh ${assignedProducts} menu produk.`);
    }
    await this.database.categories.delete(id);

    await this.database.logs.add({
      type: 'menu',
      description: `HAPUS KATEGORI MENU: ${cat?.name || `ID #${id}`}`,
      referenceId: String(id),
      createdAt: new Date(),
    });
  }

  /** Gets products, optionally filtered by category or search term */
  async getProducts(categoryId?: number, searchTerm?: string): Promise<IProduct[]> {
    let products = await this.database.products.toArray();

    // Auto-clean duplicates by name if any exist in DB
    const seenNames = new Set<string>();
    const duplicateIdsToDelete: number[] = [];
    const uniqueProducts: IProduct[] = [];

    for (const p of products) {
      const key = p.name.trim().toLowerCase();
      if (seenNames.has(key)) {
        if (p.id) duplicateIdsToDelete.push(p.id);
      } else {
        seenNames.add(key);
        uniqueProducts.push(p);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      this.database.products.bulkDelete(duplicateIdsToDelete).catch(console.error);
    }
    products = uniqueProducts;

    if (categoryId && categoryId > 0) {
      products = products.filter((p) => p.categoryId === categoryId);
    }

    if (searchTerm && searchTerm.trim().length > 0) {
      const term = searchTerm.trim().toLowerCase();
      products = products.filter((p) => p.name.toLowerCase().includes(term));
    }

    return products.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Gets a single product by ID */
  async getProductById(id: number): Promise<IProduct | undefined> {
    return await this.database.products.get(id);
  }

  /** Adds a new product */
  async addProduct(data: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();

    const id = (await this.database.products.add({
      ...data,
      name: data.name.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })) as number;

    await this.database.logs.add({
      type: 'menu',
      description: `TAMBAH MENU: ${data.name.trim()} (Rp ${data.price.toLocaleString('id-ID')})`,
      referenceId: String(id),
      createdAt: now,
    });

    return id;
  }

  /** Updates an existing product and recipe */
  async updateProduct(id: number, data: Partial<IProduct>): Promise<void> {
    const existing = await this.database.products.get(id);
    const updateData: Partial<IProduct> = {
      ...data,
      updatedAt: new Date(),
    };

    await this.database.products.update(id, updateData);

    const menuName = data.name ? data.name.trim() : (existing?.name || `ID #${id}`);
    await this.database.logs.add({
      type: 'menu',
      description: `UPDATE MENU: ${menuName}`,
      referenceId: String(id),
      createdAt: new Date(),
    });
  }

  /** Deletes a product */
  async deleteProduct(id: number): Promise<void> {
    const existing = await this.database.products.get(id);
    await this.database.products.delete(id);

    await this.database.logs.add({
      type: 'menu',
      description: `HAPUS MENU: ${existing?.name || `ID #${id}`}`,
      referenceId: String(id),
      createdAt: new Date(),
    });
  }
}

export const productService = new ProductService();

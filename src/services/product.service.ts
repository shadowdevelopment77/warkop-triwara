// ═══════════════════════════════════════════════
// Triwara POS — Product Catalog & Recipe Builder Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IProduct, ICategory } from '../types';
import { generateCodeBadge } from '../utils/currency';

export class ProductService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Gets all active categories */
  async getCategories(): Promise<ICategory[]> {
    return await this.database.categories.orderBy('sortOrder').toArray();
  }

  /** Gets products, optionally filtered by category or search term */
  async getProducts(categoryId?: number, searchTerm?: string): Promise<IProduct[]> {
    let products = await this.database.products.toArray();

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
  async addProduct(data: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt' | 'codeBadge'>): Promise<number> {
    const codeBadge = generateCodeBadge(data.name);
    const now = new Date();

    return (await this.database.products.add({
      ...data,
      name: data.name.trim(),
      codeBadge,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })) as number;
  }

  /** Updates an existing product and recipe */
  async updateProduct(id: number, data: Partial<IProduct>): Promise<void> {
    const codeBadge = data.name ? generateCodeBadge(data.name) : undefined;
    const updateData: Partial<IProduct> = {
      ...data,
      updatedAt: new Date(),
    };
    if (codeBadge) {
      updateData.codeBadge = codeBadge;
    }

    await this.database.products.update(id, updateData);
  }

  /** Deletes a product */
  async deleteProduct(id: number): Promise<void> {
    await this.database.products.delete(id);
  }
}

export const productService = new ProductService();

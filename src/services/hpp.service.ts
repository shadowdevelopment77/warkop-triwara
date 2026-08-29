// ═══════════════════════════════════════════════
// Triwara POS — HPP & Stock Deduction Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IProduct, IIngredient, OrderType, IOrder } from '../types';

export interface IHppBreakdownItem {
  name: string;
  amount: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  isPackaging: boolean;
}

export interface IHppBreakdown {
  baseHpp: number; // Cost of ingredients
  packagingHpp: number; // Cost of takeaway packaging
  totalHpp: number; // Combined HPP
  sellingPrice: number;
  grossProfit: number;
  marginPercent: number;
  items: IHppBreakdownItem[];
}

export interface IAvailabilityInfo {
  isAvailable: boolean;
  missingItemName?: string;
  maxPossibleQty?: number;
}

export class HppService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /**
   * Checks if required ingredients and packaging are available in current stock
   */
  async checkStockAvailability(
    product: IProduct,
    orderType: OrderType = 'dine_in',
    requestedQty: number = 1
  ): Promise<IAvailabilityInfo> {
    const ingredients = await this.database.ingredients.toArray();
    const ingMap = new Map<number, IIngredient>();
    ingredients.forEach((ing) => {
      if (ing.id) ingMap.set(ing.id, ing);
    });

    // 1. Check base recipe ingredients
    if (product.recipe && Array.isArray(product.recipe)) {
      for (const item of product.recipe) {
        const ing = ingMap.get(item.ingredientId);
        const needed = item.amount * requestedQty;
        if (!ing || ing.currentStock < needed) {
          return {
            isAvailable: false,
            missingItemName: ing ? ing.name : 'Bahan Baku',
            maxPossibleQty: ing && item.amount > 0 ? Math.floor(Math.max(0, ing.currentStock) / item.amount) : 0,
          };
        }
      }
    }

    // 2. Check takeaway packaging if takeaway
    if (orderType === 'takeaway' && product.takeawayPackaging && Array.isArray(product.takeawayPackaging)) {
      for (const item of product.takeawayPackaging) {
        const ing = ingMap.get(item.ingredientId);
        const needed = item.amount * requestedQty;
        if (!ing || ing.currentStock < needed) {
          return {
            isAvailable: false,
            missingItemName: ing ? `${ing.name} (Kemasan)` : 'Kemasan Takeaway',
            maxPossibleQty: ing && item.amount > 0 ? Math.floor(Math.max(0, ing.currentStock) / item.amount) : 0,
          };
        }
      }
    }

    return { isAvailable: true };
  }

  /** Calculates detailed HPP breakdown for a product based on current ingredient costs */
  async calculateProductHpp(
    product: IProduct,
    orderType: OrderType = 'dine_in'
  ): Promise<IHppBreakdown> {
    const ingredients = await this.database.ingredients.toArray();
    const ingMap = new Map<number, IIngredient>();
    ingredients.forEach((ing) => {
      if (ing.id) ingMap.set(ing.id, ing);
    });

    const items: IHppBreakdownItem[] = [];
    let baseHpp = 0;
    let packagingHpp = 0;

    // 1. Calculate Base Recipe HPP
    if (product.recipe && Array.isArray(product.recipe)) {
      for (const rec of product.recipe) {
        const ing = ingMap.get(rec.ingredientId);
        const costPerUnit = ing ? ing.costPerUnit : 0;
        const totalCost = rec.amount * costPerUnit;
        baseHpp += totalCost;

        items.push({
          name: ing ? ing.name : 'Unknown Ingredient',
          amount: rec.amount,
          unit: rec.unit,
          costPerUnit,
          totalCost,
          isPackaging: false,
        });
      }
    }

    // 2. Calculate Takeaway Packaging HPP
    if (orderType === 'takeaway' && product.takeawayPackaging && Array.isArray(product.takeawayPackaging)) {
      for (const pkg of product.takeawayPackaging) {
        const ing = ingMap.get(pkg.ingredientId);
        const costPerUnit = ing ? ing.costPerUnit : 0;
        const totalCost = pkg.amount * costPerUnit;
        packagingHpp += totalCost;

        items.push({
          name: ing ? `${ing.name} (Kemasan)` : 'Kemasan',
          amount: pkg.amount,
          unit: pkg.unit,
          costPerUnit,
          totalCost,
          isPackaging: true,
        });
      }
    }

    const totalHpp = baseHpp + packagingHpp;
    const sellingPrice = product.price;
    const grossProfit = sellingPrice - totalHpp;
    const marginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
      baseHpp,
      packagingHpp,
      totalHpp: Math.round(totalHpp),
      sellingPrice,
      grossProfit: Math.round(grossProfit),
      marginPercent: Math.round(marginPercent * 10) / 10,
      items,
    };
  }

  /** Deducts inventory ingredients when an order is completed */
  async deductInventoryForOrder(order: IOrder): Promise<string[]> {
    const alerts: string[] = [];

    for (const item of order.items) {
      const product = await this.database.products.get(item.productId);
      if (!product) continue;

      // 1. Deduct main recipe ingredients × item.qty
      if (product.recipe) {
        for (const rec of product.recipe) {
          const ing = await this.database.ingredients.get(rec.ingredientId);
          if (ing && ing.id) {
            const deductedQty = rec.amount * item.qty;
            const newStock = ing.currentStock - deductedQty;

            await this.database.ingredients.update(ing.id, {
              currentStock: newStock,
              updatedAt: new Date(),
            });

            await this.database.inventoryLogs.add({
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'sale',
              quantity: -deductedQty,
              note: `Penjualan ${order.orderNumber} (${item.productName} × ${item.qty})`,
              referenceOrderNumber: order.orderNumber,
              createdAt: new Date(),
            });
          }
        }
      }

      // 2. Deduct takeaway packaging × item.qty if takeaway
      if (item.orderType === 'takeaway' && product.takeawayPackaging) {
        for (const pkg of product.takeawayPackaging) {
          const ing = await this.database.ingredients.get(pkg.ingredientId);
          if (ing && ing.id) {
            const deductedQty = pkg.amount * item.qty;
            const newStock = ing.currentStock - deductedQty;

            await this.database.ingredients.update(ing.id, {
              currentStock: newStock,
              updatedAt: new Date(),
            });

            await this.database.inventoryLogs.add({
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'sale',
              quantity: -deductedQty,
              note: `Kemasan Takeaway ${order.orderNumber}`,
              referenceOrderNumber: order.orderNumber,
              createdAt: new Date(),
            });
          }
        }
      }

      // 3. Deduct extra toppings × item.qty
      if (item.toppings && Array.isArray(item.toppings)) {
        for (const top of item.toppings) {
          if (top.ingredientId && top.amount) {
            const ing = await this.database.ingredients.get(top.ingredientId);
            if (ing && ing.id) {
              const deductedQty = top.amount * item.qty;
              const newStock = ing.currentStock - deductedQty;

              await this.database.ingredients.update(ing.id, {
                currentStock: newStock,
                updatedAt: new Date(),
              });

              await this.database.inventoryLogs.add({
                ingredientId: ing.id,
                ingredientName: ing.name,
                type: 'sale',
                quantity: -deductedQty,
                note: `Topping ${top.name} (${order.orderNumber})`,
                referenceOrderNumber: order.orderNumber,
                createdAt: new Date(),
              });
            }
          }
        }
      }
    }

    // Check low stock alerts
    const allIngredients = await this.database.ingredients.toArray();
    for (const ing of allIngredients) {
      if (ing.currentStock <= ing.minStock) {
        alerts.push(`Stok ${ing.name} tersisa ${ing.currentStock} ${ing.unit} (<= ${ing.minStock})`);
      }
    }

    return alerts;
  }

  /** Restores inventory when an order is voided */
  async restoreInventoryForOrder(order: IOrder): Promise<void> {
    for (const item of order.items) {
      const product = await this.database.products.get(item.productId);
      if (!product) continue;

      // 1. Restore recipe ingredients
      if (product.recipe) {
        for (const rec of product.recipe) {
          const ing = await this.database.ingredients.get(rec.ingredientId);
          if (ing && ing.id) {
            const restoredQty = rec.amount * item.qty;
            await this.database.ingredients.update(ing.id, {
              currentStock: ing.currentStock + restoredQty,
              updatedAt: new Date(),
            });

            await this.database.inventoryLogs.add({
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'void_return',
              quantity: restoredQty,
              note: `Pengembalian VOID ${order.orderNumber} (${item.productName})`,
              referenceOrderNumber: order.orderNumber,
              createdAt: new Date(),
            });
          }
        }
      }

      // 2. Restore takeaway packaging
      if (item.orderType === 'takeaway' && product.takeawayPackaging) {
        for (const pkg of product.takeawayPackaging) {
          const ing = await this.database.ingredients.get(pkg.ingredientId);
          if (ing && ing.id) {
            const restoredQty = pkg.amount * item.qty;
            await this.database.ingredients.update(ing.id, {
              currentStock: ing.currentStock + restoredQty,
              updatedAt: new Date(),
            });

            await this.database.inventoryLogs.add({
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'void_return',
              quantity: restoredQty,
              note: `Pengembalian Kemasan VOID ${order.orderNumber}`,
              referenceOrderNumber: order.orderNumber,
              createdAt: new Date(),
            });
          }
        }
      }

      // 3. Restore extra toppings
      if (item.toppings && Array.isArray(item.toppings)) {
        for (const top of item.toppings) {
          if (top.ingredientId && top.amount) {
            const ing = await this.database.ingredients.get(top.ingredientId);
            if (ing && ing.id) {
              const restoredQty = top.amount * item.qty;
              await this.database.ingredients.update(ing.id, {
                currentStock: ing.currentStock + restoredQty,
                updatedAt: new Date(),
              });

              await this.database.inventoryLogs.add({
                ingredientId: ing.id,
                ingredientName: ing.name,
                type: 'void_return',
                quantity: restoredQty,
                note: `Pengembalian Topping VOID ${order.orderNumber} (${top.name})`,
                referenceOrderNumber: order.orderNumber,
                createdAt: new Date(),
              });
            }
          }
        }
      }
    }
  }
}

export const hppService = new HppService();

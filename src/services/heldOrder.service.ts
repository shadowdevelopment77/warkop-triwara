// ═══════════════════════════════════════════════
// Triwara POS — Held Order (Simpan Pesanan) Service
// ═══════════════════════════════════════════════
//
// A held order is just a saved snapshot of the cart, kept for later.
// It never touches orders/dailySummaries/stock — those only get affected
// once a held order is resumed and actually paid via the existing
// OrderService.createOrder() flow (unchanged).

import { db, TriwaraDatabase } from '../database/db';
import type { ICartItem, IHeldOrder } from '../types';

export class HeldOrderService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /**
   * Saves the current cart as a held order. Customer name is optional —
   * callers should pass an empty string / undefined if the cashier skips it.
   */
  async holdOrder(
    cartItems: ICartItem[],
    customerName: string | undefined,
    discountPercent: number = 0
  ): Promise<IHeldOrder> {
    if (cartItems.length === 0) {
      throw new Error('Keranjang kosong, tidak ada yang bisa disimpan.');
    }

    const heldOrder: IHeldOrder = {
      customerName: customerName?.trim() || undefined,
      cartItems,
      discountPercent,
      createdAt: new Date(),
    };

    const id = await this.database.heldOrders.add(heldOrder);
    return { ...heldOrder, id };
  }

  /** Lists all held orders, most recently saved first. */
  async getHeldOrders(): Promise<IHeldOrder[]> {
    return await this.database.heldOrders.orderBy('createdAt').reverse().toArray();
  }

  /** Number of held orders — used for the header badge count. */
  async getHeldOrderCount(): Promise<number> {
    return await this.database.heldOrders.count();
  }

  /** Gets a held order without removing it. The UI deletes it only after its cart is restored. */
  async getHeldOrder(id: number): Promise<IHeldOrder | null> {
    return (await this.database.heldOrders.get(id)) || null;
  }

  /** Cancels/discards a held order without loading it into the cart. */
  async deleteHeldOrder(id: number): Promise<void> {
    await this.database.heldOrders.delete(id);
  }
}

export const heldOrderService = new HeldOrderService();

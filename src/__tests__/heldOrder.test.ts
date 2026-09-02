import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { HeldOrderService } from '../services/heldOrder.service';
import type { ICartItem, IProduct } from '../types';

describe('HeldOrderService', () => {
  let testDb: TriwaraDatabase;
  let heldOrderService: HeldOrderService;
  let cartItems: ICartItem[];

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    heldOrderService = new HeldOrderService(testDb);
    await testDb.heldOrders.clear();

    const product: IProduct = {
      id: 1, categoryId: 1, name: 'Americano', price: 18000, description: '',
      recipe: [], takeawayPackaging: [], availableAdditionals: [], isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    };
    cartItems = [{
      cartId: 'c1', product, quantity: 1, itemPrice: 18000, itemHpp: 3600, notes: '',
      orderType: 'dine_in', temperature: 'Iced', sugarLevel: 'Normal', extraToppings: [],
    }];
  });

  it('throws when trying to hold an empty cart', async () => {
    await expect(heldOrderService.holdOrder([], 'Budi')).rejects.toThrow();
  });

  it('holds an order with an optional customer name, and lists it', async () => {
    await heldOrderService.holdOrder(cartItems, 'Budi', 0);
    const list = await heldOrderService.getHeldOrders();
    expect(list).toHaveLength(1);
    expect(list[0].customerName).toBe('Budi');
    expect(list[0].cartItems).toHaveLength(1);
    expect(await heldOrderService.getHeldOrderCount()).toBe(1);
  });

  it('holds an order with no customer name just fine', async () => {
    await heldOrderService.holdOrder(cartItems, undefined, 0);
    const list = await heldOrderService.getHeldOrders();
    expect(list[0].customerName).toBeUndefined();
  });

  it('gets a held order without removing it, so UI can restore its cart safely first', async () => {
    const held = await heldOrderService.holdOrder(cartItems, 'Siti', 10);
    const resumed = await heldOrderService.getHeldOrder(held.id!);

    expect(resumed?.customerName).toBe('Siti');
    expect(resumed?.discountPercent).toBe(10);
    expect(await heldOrderService.getHeldOrderCount()).toBe(1);
  });

  it('returns null for a non-existent held order', async () => {
    const resumed = await heldOrderService.getHeldOrder(9999);
    expect(resumed).toBeNull();
  });

  it('deleting a held order discards it without returning it', async () => {
    const held = await heldOrderService.holdOrder(cartItems, 'Andi', 0);
    await heldOrderService.deleteHeldOrder(held.id!);
    expect(await heldOrderService.getHeldOrderCount()).toBe(0);
  });
});

import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TriwaraDatabase } from '../database/db';
import { OrderService } from '../services/order.service';
import { HppService } from '../services/hpp.service';
import type { ICartItem, IProduct } from '../types';

describe('OrderService Transaction & Void Integrity', () => {
  let testDb: TriwaraDatabase;
  let orderService: OrderService;
  let hppService: HppService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    await testDb.open();
    await testDb.ingredients.clear();
    await testDb.products.clear();
    await testDb.orders.clear();
    await testDb.inventoryLogs.clear();
    await testDb.logs.clear();

    hppService = new HppService(testDb);
    orderService = new OrderService(testDb, hppService);
  });

  it('creates order, deducts stock (recipe + packaging + toppings), and freezes HPP snapshot', async () => {
    // 1. Setup Ingredients
    const beansId = (await testDb.ingredients.add({
      name: 'Coffee Beans',
      category: 'raw',
      unit: 'gr',
      currentStock: 1000,
      minStock: 100,
      costPerUnit: 200,
      purchasePackageName: 'Bag 1kg',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const cupId = (await testDb.ingredients.add({
      name: 'Paper Cup',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 100,
      minStock: 20,
      costPerUnit: 1500,
      purchasePackageName: 'Sleeve 50pcs',
      purchasePrice: 75000,
      purchaseQuantity: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const product: IProduct = {
      id: 1,
      categoryId: 1,
      name: 'Americano Takeaway',
      codeBadge: 'AT',
      price: 20000,
      description: 'Americano to go',
      recipe: [{ ingredientId: beansId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [{ ingredientId: cupId, amount: 1, unit: 'pcs' }],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await testDb.products.add(product);

    // 2. Cart item with Extra Espresso Topping (+18gr beans, price +5,000, hpp = 18*200 = 3,600)
    const cartItem: ICartItem = {
      cartId: 'item-1',
      product,
      quantity: 2, // 2 cups
      orderType: 'takeaway',
      temperature: 'Iced',
      sugarLevel: 'normal',
      extraToppings: [
        {
          name: 'Extra Shot Espresso',
          price: 5000,
          ingredientId: beansId,
          amount: 18,
        },
      ],
      notes: 'Less ice',
      itemPrice: 25000, // 20000 + 5000
      itemHpp: 0,
    };

    // 3. Process Checkout (Discount 10%)
    const { order } = await orderService.createOrder(
      [cartItem],
      'Budi',
      10, // 10% discount
      'cash',
      50000
    );

    // Subtotal: 2 * 25,000 = 50,000
    // Discount 10%: 5,000 -> Total: 45,000
    expect(order.subtotal).toBe(50000);
    expect(order.discountAmount).toBe(5000);
    expect(order.total).toBe(45000);

    // Expected HPP per unit:
    // Base recipe = 18gr * 200 = 3,600
    // Packaging = 1 * 1,500 = 1,500
    // Topping = 18gr * 200 = 3,600
    // Unit HPP = 3,600 + 1,500 + 3,600 = 8,700
    // Total HPP for 2 units = 8,700 * 2 = 17,400
    expect(order.hppTotal).toBe(17400);
    expect(order.profit).toBe(45000 - 17400); // 27,600

    // Verify stock deduction:
    // Beans deducted = (18gr recipe + 18gr topping) * 2 qty = 72gr -> 1000 - 72 = 928
    const beansAfter = await testDb.ingredients.get(beansId);
    expect(beansAfter?.currentStock).toBe(928);

    // Cups deducted = 1 * 2 qty = 2 -> 100 - 2 = 98
    const cupAfter = await testDb.ingredients.get(cupId);
    expect(cupAfter?.currentStock).toBe(98);

    // 4. Test Void / Cancellation
    await orderService.voidOrder(order.id!, 'Salah input pesanan');

    const voidedOrder = await testDb.orders.get(order.id!);
    expect(voidedOrder?.status).toBe('voided');
    expect(voidedOrder?.voidReason).toBe('Salah input pesanan');

    // Verify stock restoration:
    const beansRestored = await testDb.ingredients.get(beansId);
    expect(beansRestored?.currentStock).toBe(1000); // Returned to 1000!

    const cupRestored = await testDb.ingredients.get(cupId);
    expect(cupRestored?.currentStock).toBe(100); // Returned to 100!
  });
});

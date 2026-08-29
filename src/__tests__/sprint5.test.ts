import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import type { ICartItem, IProduct } from '../types';

describe('Sprint 5 Feature Tests — Per-Menu Additionals & Stock Calculation', () => {
  let testDb: TriwaraDatabase;
  let productService: ProductService;
  let orderService: OrderService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    productService = new ProductService(testDb);
    orderService = new OrderService(testDb);

    await testDb.products.clear();
    await testDb.ingredients.clear();
    await testDb.orders.clear();
    await testDb.inventoryLogs.clear();
  });

  it('persists and retrieves per-menu additionals on product', async () => {
    const beansId = (await testDb.ingredients.add({
      name: 'Biji Kopi Arabica',
      category: 'raw',
      unit: 'gr',
      currentStock: 1000,
      minStock: 200,
      costPerUnit: 200,
      purchasePackageName: 'Pack 1kg',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const prodId = await productService.addProduct({
      categoryId: 1,
      name: 'Americano Specialty',
      price: 20000,
      description: 'Espresso double with water',
      recipe: [{ ingredientId: beansId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansId, amount: 18 },
      ],
      isActive: true,
    });

    const savedProd = await productService.getProductById(prodId);
    expect(savedProd).toBeDefined();
    expect(savedProd?.availableAdditionals).toHaveLength(1);
    expect(savedProd?.availableAdditionals?.[0].name).toBe('Extra Shot Espresso');
    expect(savedProd?.availableAdditionals?.[0].price).toBe(5000);
    expect(savedProd?.availableAdditionals?.[0].ingredientId).toBe(beansId);
    expect(savedProd?.availableAdditionals?.[0].amount).toBe(18);
  });

  it('calculates order HPP and deducts ingredient stock for per-menu additionals', async () => {
    const beansId = (await testDb.ingredients.add({
      name: 'Biji Kopi Arabica',
      category: 'raw',
      unit: 'gr',
      currentStock: 1000,
      minStock: 200,
      costPerUnit: 200,
      purchasePackageName: 'Pack 1kg',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const product: IProduct = {
      id: 1,
      categoryId: 1,
      name: 'Americano',
      codeBadge: 'AM',
      price: 18000,
      description: 'Americano',
      recipe: [{ ingredientId: beansId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansId, amount: 18 },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await testDb.products.add(product);

    // Cart with 1x Americano + 1x Extra Shot (18gr base + 18gr topping = 36gr total beans)
    const cartItems: ICartItem[] = [
      {
        cartId: 'cart-1',
        product,
        quantity: 1,
        itemPrice: 23000, // 18.000 + 5.000
        itemHpp: 7200,
        notes: '',
        orderType: 'dine_in',
        temperature: 'Iced',
        sugarLevel: 'Normal',
        extraToppings: [
          {
            name: 'Extra Shot Espresso',
            price: 5000,
            ingredientId: beansId,
            amount: 18,
          },
        ],
      },
    ];

    const { order } = await orderService.createOrder(
      cartItems,
      'Pelanggan Setia',
      0,
      'cash',
      50000
    );

    // Base HPP = 18 * 200 = 3600
    // Topping HPP = 18 * 200 = 3600
    // Total HPP = 7200
    expect(order.hppTotal).toBe(7200);
    expect(order.total).toBe(23000);
    expect(order.profit).toBe(23000 - 7200);

    // Verify stock deducted: 1000 - 36 = 964
    const updatedIng = await testDb.ingredients.get(beansId);
    expect(updatedIng?.currentStock).toBe(964);

    // Void the order and verify stock restored
    await orderService.voidOrder(order.id!, 'Salah input meja');
    const restoredIng = await testDb.ingredients.get(beansId);
    expect(restoredIng?.currentStock).toBe(1000);
  });
});

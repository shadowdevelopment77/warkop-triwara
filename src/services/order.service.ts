// ═══════════════════════════════════════════════
// Triwara POS — Order & Transaction Service (OOP with HPP Snapshot)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IOrder, ICartItem, IOrderItem } from '../types';
import { hppService, HppService } from './hpp.service';
import { startOfDay, endOfDay } from '../utils/date';

export class OrderService {
  private database: TriwaraDatabase;
  private hppService: HppService;

  constructor(database: TriwaraDatabase = db, hppSvc: HppService = hppService) {
    this.database = database;
    this.hppService = hppSvc;
  }

  /** Generates daily order sequence number and order string e.g. TRW-20260829-001 */
  async generateOrderNumber(): Promise<{ orderNumber: string; sequenceNumber: number }> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const todayOrders = await this.database.orders
      .where('createdAt')
      .between(startOfDay(today), endOfDay(today))
      .toArray();

    const sequenceNumber = todayOrders.length + 1;
    const orderNumber = `TRW-${dateStr}-${String(sequenceNumber).padStart(3, '0')}`;

    return { orderNumber, sequenceNumber };
  }

  /** Submits transaction with permanent HPP Snapshot and inventory deduction */
  async createOrder(
    cartItems: ICartItem[],
    customerName: string,
    discountPercent: number,
    paymentMethod: 'cash' | 'qris',
    paymentAmount: number
  ): Promise<{ order: IOrder; lowStockAlerts: string[] }> {
    if (cartItems.length === 0) {
      throw new Error('Keranjang belanja masih kosong');
    }

    const { orderNumber, sequenceNumber } = await this.generateOrderNumber();
    const orderItems: IOrderItem[] = [];
    let subtotal = 0;
    let hppTotal = 0;

    for (const item of cartItems) {
      // Calculate live HPP snapshot for this item (base recipe + takeaway packaging)
      const hppBreakdown = await this.hppService.calculateProductHpp(item.product, item.orderType);

      // Calculate real topping HPP dynamically from ingredient costPerUnit
      let extraToppingHppSum = 0;
      const orderItemToppings: { name: string; price: number; hppCost: number; ingredientId?: number; amount?: number }[] = [];

      for (const t of item.extraToppings) {
        let toppingHpp = 0;
        if (t.ingredientId && t.amount) {
          const ing = await this.database.ingredients.get(t.ingredientId);
          if (ing) {
            toppingHpp = Math.round(t.amount * ing.costPerUnit);
          }
        }
        extraToppingHppSum += toppingHpp;
        orderItemToppings.push({
          name: t.name,
          price: t.price,
          hppCost: toppingHpp,
          ingredientId: t.ingredientId,
          amount: t.amount,
        });
      }

      const itemHpp = hppBreakdown.totalHpp + extraToppingHppSum;
      const itemSubtotal = item.itemPrice * item.quantity;
      const itemHppSubtotal = itemHpp * item.quantity;

      subtotal += itemSubtotal;
      hppTotal += itemHppSubtotal;

      orderItems.push({
        productId: item.product.id!,
        productName: item.product.name,
        codeBadge: item.product.codeBadge,
        price: item.itemPrice,
        hpp: itemHpp, // Accurate HPP Snapshot!
        qty: item.quantity,
        orderType: item.orderType,
        subtotal: itemSubtotal,
        hppSubtotal: itemHppSubtotal,
        toppings: orderItemToppings,
        notes: item.notes,
      });
    }

    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const total = subtotal - discountAmount;
    const changeAmount = paymentMethod === 'cash' ? Math.max(0, paymentAmount - total) : 0;
    const profit = total - hppTotal;

    const orderData: IOrder = {
      orderNumber,
      sequenceNumber,
      customerName: customerName.trim() || 'Umum',
      items: orderItems,
      subtotal,
      discountPercent,
      discountAmount,
      total,
      hppTotal,
      profit,
      paymentMethod,
      paymentAmount: paymentMethod === 'cash' ? paymentAmount : total,
      changeAmount,
      status: 'completed',
      createdAt: new Date(),
    };

    // Save order & deduct stock in Dexie transaction
    const orderId = await this.database.orders.add(orderData);
    const savedOrder = { ...orderData, id: orderId };

    // Deduct stock and get stock alert notifications
    const lowStockAlerts = await this.hppService.deductInventoryForOrder(savedOrder);

    return { order: savedOrder, lowStockAlerts };
  }

  /** Voids a transaction, returns stock to inventory, and logs void event */
  async voidOrder(orderId: number, reason: string): Promise<void> {
    const order = await this.database.orders.get(orderId);
    if (!order) throw new Error('Transaksi tidak ditemukan');
    if (order.status === 'voided') throw new Error('Transaksi ini sudah di-void sebelumnya');

    const now = new Date();
    await this.database.orders.update(orderId, {
      status: 'voided',
      voidedAt: now,
      voidReason: reason.trim() || 'Void oleh kasir',
    });

    // Restore inventory
    await this.hppService.restoreInventoryForOrder(order);

    // Log void activity
    await this.database.logs.add({
      type: 'void',
      description: `VOID Transaksi #${order.orderNumber} (Rp ${order.total.toLocaleString('id-ID')}) — Alasan: ${reason || 'Batal'}`,
      referenceId: order.orderNumber,
      createdAt: now,
    });
  }

  /** Gets transactions within a date range */
  async getOrders(startDate?: Date, endDate?: Date): Promise<IOrder[]> {
    let orders = await this.database.orders.toArray();

    if (startDate && endDate) {
      const start = startOfDay(startDate).getTime();
      const end = endOfDay(endDate).getTime();

      orders = orders.filter((o) => {
        const time = new Date(o.createdAt).getTime();
        return time >= start && time <= end;
      });
    }

    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const orderService = new OrderService();

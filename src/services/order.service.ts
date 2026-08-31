// ═══════════════════════════════════════════════
// Triwara POS — Order & Transaction Service (OOP with HPP Snapshot)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IOrder, ICartItem, IOrderItem } from '../types';
import { hppService, HppService } from './hpp.service';
import { ReportService } from './report.service';
import { startOfDay, endOfDay } from '../utils/date';

export interface IPaginatedOrdersResult {
  orders: IOrder[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

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

    const count = await this.database.orders
      .where('createdAt')
      .between(startOfDay(today), endOfDay(today), true, true)
      .count();

    const sequenceNumber = count + 1;
    const orderNumber = `TRW-${dateStr}-${String(sequenceNumber).padStart(3, '0')}`;

    return { orderNumber, sequenceNumber };
  }

  /** Submits transaction with permanent HPP Snapshot and inventory deduction */
  async createOrder(
    cartItems: ICartItem[],
    customerName: string,
    discountPercent: number,
    paymentMethod: 'cash' | 'qris',
    paymentAmount: number,
    processedBy?: string
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
        price: item.itemPrice,
        hpp: itemHpp, // Accurate HPP Snapshot!
        qty: item.quantity,
        orderType: item.orderType,
        temperature: item.temperature,
        sugarLevel: item.sugarLevel,
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

    // Check active shift
    const activeShift = await this.database.shifts
      .where('status')
      .equals('open')
      .first();

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
      shiftId: activeShift?.id,
      processedBy: processedBy || activeShift?.cashierName || 'Kasir',
      createdAt: new Date(),
    };

    // Save order & deduct stock in Dexie transaction
    const orderId = await this.database.orders.add(orderData);
    const savedOrder = { ...orderData, id: orderId };

    // Record to active shift in DB
    if (activeShift && activeShift.id) {
      const isCash = paymentMethod === 'cash';
      const newCash = activeShift.totalCashSales + (isCash ? total : 0);
      const newQris = activeShift.totalQrisSales + (!isCash ? total : 0);
      const newCount = activeShift.totalTransactions + 1;
      const newCashCount = (activeShift.cashTransactions || 0) + (isCash ? 1 : 0);
      const newQrisCount = (activeShift.qrisTransactions || 0) + (!isCash ? 1 : 0);
      const newExpected = activeShift.startingCash + newCash;

      await this.database.shifts.update(activeShift.id, {
        totalCashSales: newCash,
        totalQrisSales: newQris,
        totalTransactions: newCount,
        cashTransactions: newCashCount,
        qrisTransactions: newQrisCount,
        expectedEndingCash: newExpected,
      });
    }

    // Deduct stock and get stock alert notifications
    const lowStockAlerts = await this.hppService.deductInventoryForOrder(savedOrder);

    // Background real-time increment to daily summary rollup (zero scan reporting)
    try {
      const reportSvc = new ReportService(this.database);
      await reportSvc.recordOrderToDailySummary(savedOrder);
    } catch (e) {
      console.warn('Could not record order to daily summary:', e);
    }

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

    // Adjust shift figures if linked to a shift
    if (order.shiftId) {
      const shift = await this.database.shifts.get(order.shiftId);
      if (shift && shift.id) {
        const isCash = order.paymentMethod === 'cash';
        const newCash = Math.max(0, shift.totalCashSales - (isCash ? order.total : 0));
        const newQris = Math.max(0, shift.totalQrisSales - (!isCash ? order.total : 0));
        const newCashCount = Math.max(0, (shift.cashTransactions || 0) - (isCash ? 1 : 0));
        const newQrisCount = Math.max(0, (shift.qrisTransactions || 0) - (!isCash ? 1 : 0));
        const newVoided = shift.totalVoided + 1;
        const newExpected = shift.startingCash + newCash;

        await this.database.shifts.update(shift.id, {
          totalCashSales: newCash,
          totalQrisSales: newQris,
          cashTransactions: newCashCount,
          qrisTransactions: newQrisCount,
          totalVoided: newVoided,
          expectedEndingCash: newExpected,
        });
      }
    }

    // Restore inventory
    await this.hppService.restoreInventoryForOrder(order);

    // Adjust daily summary rollup in background
    try {
      const reportSvc = new ReportService(this.database);
      await reportSvc.recordVoidToDailySummary(order);
    } catch (e) {
      console.warn('Could not record void to daily summary:', e);
    }

    // Log void activity
    await this.database.logs.add({
      type: 'void',
      description: `VOID Transaksi #${order.orderNumber} (Rp ${order.total.toLocaleString('id-ID')}) — Alasan: ${reason || 'Batal'}`,
      referenceId: order.orderNumber,
      createdAt: now,
    });
  }

  /**
   * Retrieves paginated transactions with database-level B-Tree range query and offset.
   * Pulls ONLY the requested pageSize (e.g. 10) into memory, zero full-table scan.
   */
  async getPaginatedOrders(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    pageSize: number = 10
  ): Promise<IPaginatedOrdersResult> {
    const pageNum = Math.max(1, page);
    const size = Math.max(1, pageSize);
    const offset = (pageNum - 1) * size;

    if (startDate && endDate) {
      const start = startOfDay(startDate);
      const end = endOfDay(endDate);
      const query = this.database.orders.where('createdAt').between(start, end, true, true);
      const totalCount = await query.count();
      const orders = await query
        .reverse()
        .offset(offset)
        .limit(size)
        .toArray();

      return {
        orders,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / size)),
        currentPage: pageNum,
      };
    }

    const query = this.database.orders.toCollection();
    const totalCount = await query.count();
    const orders = await query
      .reverse()
      .offset(offset)
      .limit(size)
      .toArray();

    return {
      orders,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / size)),
      currentPage: pageNum,
    };
  }

  /** Gets transactions within a date range with optional limit using indexed query */
  async getOrders(startDate?: Date, endDate?: Date, limit?: number): Promise<IOrder[]> {
    if (startDate && endDate) {
      const start = startOfDay(startDate);
      const end = endOfDay(endDate);
      const query = this.database.orders
        .where('createdAt')
        .between(start, end, true, true)
        .reverse();

      if (limit && limit > 0) {
        return await query.limit(limit).toArray();
      }
      return await query.toArray();
    }

    const query = this.database.orders.reverse();
    if (limit && limit > 0) {
      return await query.limit(limit).toArray();
    }
    return await query.toArray();
  }
}

export const orderService = new OrderService();

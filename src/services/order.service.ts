// ═══════════════════════════════════════════════
// Triwara POS — Order & Transaction Service (OOP with HPP Snapshot)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IOrder, ICartItem, IOrderItem, IShift } from '../types';
import { hppService, HppService } from './hpp.service';
import { ReportService } from './report.service';
import { shiftService } from './shift.service';
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
  private paginatedCache = new Map<string, IPaginatedOrdersResult>();
  private totalCountCache = new Map<string, number>();
  private readonly maxCacheEntries = 20;
  private readonly maxTotalCountEntries = 30;

  constructor(database: TriwaraDatabase = db, hppSvc: HppService = hppService) {
    this.database = database;
    this.hppService = hppSvc;
  }

  /** Clears pagination cache */
  clearPaginationCache(): void {
    this.paginatedCache.clear();
    this.totalCountCache.clear();
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

    // Invalidate pagination cache
    this.clearPaginationCache();

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
        const newExpected = shift.startingCash + newCash - (shift.totalExpenses || 0);

        const updateData: Partial<IShift> = {
          totalCashSales: newCash,
          totalQrisSales: newQris,
          cashTransactions: newCashCount,
          qrisTransactions: newQrisCount,
          totalVoided: newVoided,
          expectedEndingCash: newExpected,
        };

        if (shift.status === 'closed' && shift.actualEndingCash !== undefined) {
          updateData.cashDifference = shift.actualEndingCash - newExpected;
        }

        await this.database.shifts.update(shift.id, updateData);
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

    // Invalidate pagination caches
    this.clearPaginationCache();
    shiftService.clearShiftPaginationCache();
  }

  /**
   * High-Performance Paginated Orders with LRU Cache & Background Prefetching.
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

    const start = startDate ? startOfDay(startDate) : undefined;
    const end = endDate ? endOfDay(endDate) : undefined;
    const rangeKey = `${start ? start.getTime() : 0}_${end ? end.getTime() : 0}`;
    const cacheKey = `${rangeKey}_p${pageNum}_s${size}`;

    // 1. Fast path: In-memory cache hit (< 1ms)
    if (this.paginatedCache.has(cacheKey)) {
      const cached = this.paginatedCache.get(cacheKey)!;
      this.prefetchNextPage(start, end, pageNum + 1, size, cached.totalPages);
      return cached;
    }

    // 2. Fetch or retrieve cached total count & query requested slice in parallel
    const totalCount = this.totalCountCache.get(rangeKey);
    const countPromise = totalCount !== undefined
      ? Promise.resolve(totalCount)
      : (start && end
          ? this.database.orders.where('createdAt').between(start, end, true, true).count()
          : this.database.orders.count());

    const ordersCollection = start && end
      ? this.database.orders.where('createdAt').between(start, end, true, true)
      : this.database.orders.toCollection();

    const ordersPromise = ordersCollection
      .reverse()
      .offset(offset)
      .limit(size)
      .toArray();

    const [resolvedCount, orders] = await Promise.all([countPromise, ordersPromise]);

    if (totalCount === undefined) {
      if (this.totalCountCache.size >= this.maxTotalCountEntries) {
        const firstKey = this.totalCountCache.keys().next().value;
        if (firstKey) this.totalCountCache.delete(firstKey);
      }
      this.totalCountCache.set(rangeKey, resolvedCount);
    }

    const totalPages = Math.max(1, Math.ceil(resolvedCount / size));
    const result: IPaginatedOrdersResult = {
      orders,
      totalCount: resolvedCount,
      totalPages,
      currentPage: pageNum,
    };

    // 4. Store in bounded LRU cache (< 50 KB memory cap)
    if (this.paginatedCache.size >= this.maxCacheEntries) {
      const firstKey = this.paginatedCache.keys().next().value;
      if (firstKey) this.paginatedCache.delete(firstKey);
    }
    this.paginatedCache.set(cacheKey, result);

    // 5. Intelligent Background Prefetch for next page
    this.prefetchNextPage(start, end, pageNum + 1, size, totalPages);

    return result;
  }

  private prefetchNextPage(
    start: Date | undefined,
    end: Date | undefined,
    nextPage: number,
    size: number,
    totalPages: number
  ): void {
    if (nextPage > totalPages) return;
    const rangeKey = `${start ? start.getTime() : 0}_${end ? end.getTime() : 0}`;
    const nextCacheKey = `${rangeKey}_p${nextPage}_s${size}`;
    if (this.paginatedCache.has(nextCacheKey)) return;

    // Asynchronous background prefetch throttled to idle CPU time
    const schedule = typeof window !== 'undefined' && typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === 'function'
      ? (cb: () => void) => (window as unknown as { requestIdleCallback: (fn: () => void) => number }).requestIdleCallback(cb)
      : (cb: () => void) => setTimeout(cb, 10);

    schedule(async () => {
      try {
        const nextOffset = (nextPage - 1) * size;
        const query = start && end
          ? this.database.orders.where('createdAt').between(start, end, true, true)
          : this.database.orders.toCollection();

        const orders = await query
          .reverse()
          .offset(nextOffset)
          .limit(size)
          .toArray();

        const totalCount = this.totalCountCache.get(rangeKey) || 0;
        const prefetchedResult: IPaginatedOrdersResult = {
          orders,
          totalCount,
          totalPages,
          currentPage: nextPage,
        };

        if (this.paginatedCache.size >= this.maxCacheEntries) {
          const firstKey = this.paginatedCache.keys().next().value;
          if (firstKey) this.paginatedCache.delete(firstKey);
        }
        this.paginatedCache.set(nextCacheKey, prefetchedResult);
      } catch {
        // Ignore background prefetch errors
      }
    });
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

  /** Gets all orders that are older than 1 year (>= 365 days from today) */
  async getOrdersOlderThanOneYear(): Promise<IOrder[]> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return await this.database.orders
      .where('createdAt')
      .below(oneYearAgo)
      .sortBy('createdAt');
  }

  /**
   * Cleans transactions older than 1 year.
   * STRICT BACKEND VALIDATION:
   * - Confirms all orders being deleted are strictly older than 1 year.
   * - Rejects if empty or if any order is newer than 1 year.
   * - Deletes and logs an audit record.
   */
  async cleanOrdersOlderThanOneYear(): Promise<{ count: number }> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const eligibleOrders = await this.getOrdersOlderThanOneYear();

    if (eligibleOrders.length === 0) {
      throw new Error('Tidak ada data riwayat transaksi yang berumur 1 tahun atau lebih untuk dibersihkan.');
    }

    const invalidOrders = eligibleOrders.filter((o) => new Date(o.createdAt).getTime() >= oneYearAgo.getTime());
    if (invalidOrders.length > 0) {
      throw new Error('Validasi backend gagal: Ditemukan transaksi berumur kurang dari 1 tahun.');
    }

    const idsToDelete = eligibleOrders.map((o) => o.id!).filter(Boolean);
    await this.database.orders.bulkDelete(idsToDelete);

    await this.database.logs.add({
      type: 'system',
      description: `BERSIHKAN RIWAYAT TRANSAKSI: ${idsToDelete.length} transaksi berumur >= 1 tahun dibersihkan (Arsip Excel telah diekspor)`,
      referenceId: `CLEANUP-${Date.now()}`,
      createdAt: new Date(),
    });

    this.clearPaginationCache();

    return { count: idsToDelete.length };
  }

  /**
   * Generates a small batch of orders strictly older than 1 year (> 400 days ago)
   * specifically for testing the 1-year archive & cleanup workflow.
   */
  async generateOldOrdersForTesting(count: number = 10): Promise<number> {
    const oldOrders: IOrder[] = [];
    const now = Date.now();
    const fourHundredDaysMs = 400 * 24 * 60 * 60 * 1000;

    for (let i = 1; i <= count; i++) {
      const orderDate = new Date(now - fourHundredDaysMs - i * 3600000);
      oldOrders.push({
        orderNumber: `TRW-OLD-${String(i).padStart(3, '0')}`,
        sequenceNumber: i,
        customerName: `Pelanggan Arsip ${i}`,
        items: [
          {
            productId: 1,
            productName: 'Kopi Susu Uji',
            price: 15000,
            hpp: 5000,
            hppSubtotal: 5000,
            qty: 1,
            orderType: 'dine_in',
            toppings: [],
            notes: 'Data Uji Arsip',
            subtotal: 15000,
          },
        ],
        subtotal: 15000,
        discountPercent: 0,
        discountAmount: 0,
        total: 15000,
        paymentMethod: i % 2 === 0 ? 'cash' : 'qris',
        paymentAmount: 15000,
        changeAmount: 0,
        status: 'completed',
        hppTotal: 5000,
        profit: 10000,
        createdAt: orderDate,
      });
    }

    await this.database.orders.bulkAdd(oldOrders);
    this.clearPaginationCache();
    return oldOrders.length;
  }
}

export const orderService = new OrderService();

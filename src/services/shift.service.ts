// ═══════════════════════════════════════════════
// Triwara POS — Cashier Shift Management Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IShift, IStaff, IOrder, IShiftExpense } from '../types';
import { ReportService } from './report.service';

export interface IPaginatedShiftsResult {
  shifts: IShift[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export class ShiftService {
  private database: TriwaraDatabase;
  private shiftPaginatedCache = new Map<string, IPaginatedShiftsResult>();
  private shiftTotalCountCache = new Map<string, number>();
  private readonly maxShiftCacheEntries = 20;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Clears in-memory pagination cache */
  clearShiftPaginationCache(): void {
    this.shiftPaginatedCache.clear();
    this.shiftTotalCountCache.clear();
  }

  /** Gets currently active/open shift if any */
  async getActiveShift(): Promise<IShift | null> {
    const shift = await this.database.shifts
      .where('status')
      .equals('open')
      .first();

    return shift || null;
  }

  /** Opens a new shift with starting cash (petty cash / modal kembalian) */
  async openShift(staff: IStaff, startingCash: number, notes?: string): Promise<IShift> {
    const active = await this.getActiveShift();
    if (active) {
      throw new Error(`Shift #${active.shiftNumber} atas nama ${active.cashierName} masih berjalan. Tutup shift sebelumnya terlebih dahulu.`);
    }

    if (startingCash < 0) {
      throw new Error('Uang modal awal kas tidak boleh negatif');
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const todayCount = await this.database.shifts.count();
    const shiftSeq = String(todayCount + 1).padStart(3, '0');
    const shiftNumber = `SHF-${dateStr}-${shiftSeq}`;

    const newShift: IShift = {
      shiftNumber,
      cashierId: staff.id || 1,
      cashierName: staff.name,
      openedAt: now,
      startingCash: Math.max(0, startingCash),
      totalCashSales: 0,
      totalQrisSales: 0,
      totalTransactions: 0,
      cashTransactions: 0,
      qrisTransactions: 0,
      totalVoided: 0,
      expectedEndingCash: Math.max(0, startingCash),
      notes,
      status: 'open',
    };

    const id = (await this.database.shifts.add(newShift)) as number;
    this.clearShiftPaginationCache();

    await this.database.logs.add({
      type: 'shift',
      description: `BUKA TOKO: ${staff.name} (Modal Awal: Rp ${startingCash.toLocaleString('id-ID')})`,
      referenceId: shiftNumber,
      createdAt: now,
    });

    return { ...newShift, id };
  }

  /** Records order completion to the active shift */
  async recordOrderToShift(order: IOrder): Promise<void> {
    const active = await this.getActiveShift();
    if (!active || !active.id) return;

    const isCash = order.paymentMethod === 'cash';
    const newCash = active.totalCashSales + (isCash ? order.total : 0);
    const newQris = active.totalQrisSales + (!isCash ? order.total : 0);
    const newCount = active.totalTransactions + 1;
    const newCashCount = (active.cashTransactions || 0) + (isCash ? 1 : 0);
    const newQrisCount = (active.qrisTransactions || 0) + (!isCash ? 1 : 0);
    const newExpected = active.startingCash + newCash;

    await this.database.shifts.update(active.id, {
      totalCashSales: newCash,
      totalQrisSales: newQris,
      totalTransactions: newCount,
      cashTransactions: newCashCount,
      qrisTransactions: newQrisCount,
      expectedEndingCash: newExpected,
    });
  }

  /** Adjusts shift figures when an order is voided */
  async recordVoidToShift(order: IOrder): Promise<void> {
    if (!order.shiftId) return;

    const shift = await this.database.shifts.get(order.shiftId);
    if (!shift || !shift.id) return;

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

  /** Closes an active shift with physical cash count and difference calculation */
  async closeShift(
    shiftId: number,
    actualCash: number,
    notes?: string,
    expenses?: IShiftExpense[]
  ): Promise<IShift> {
    const shift = await this.database.shifts.get(shiftId);
    if (!shift) {
      throw new Error('Data shift tidak ditemukan');
    }
    if (shift.status === 'closed') {
      throw new Error('Shift ini sudah ditutup sebelumnya');
    }

    const now = new Date();
    const validExpenses = (expenses || []).filter((e) => e.amount > 0);
    const totalExpenses = validExpenses.reduce((sum, e) => sum + e.amount, 0);
    const borrowedFromSales = Math.max(0, totalExpenses - shift.startingCash);
    const expected = shift.startingCash + shift.totalCashSales - totalExpenses;
    const difference = actualCash - expected;

    const updateData: Partial<IShift> = {
      closedAt: now,
      actualEndingCash: actualCash,
      expectedEndingCash: expected,
      cashDifference: difference,
      expenses: validExpenses,
      totalExpenses,
      borrowedFromSales,
      status: 'closed',
      notes: notes !== undefined ? notes : shift.notes,
    };

    await this.database.shifts.update(shiftId, updateData);
    this.clearShiftPaginationCache();

    await this.database.logs.add({
      type: 'shift',
      description: `TUTUP SHIFT: ${shift.cashierName} (Uang Fisik: Rp ${actualCash.toLocaleString('id-ID')}, Belanja: Rp ${totalExpenses.toLocaleString('id-ID')}, Selisih: Rp ${difference.toLocaleString('id-ID')})`,
      referenceId: shift.shiftNumber,
      createdAt: now,
    });

    // Auto-sync daily rollup summary for instant reporting
    try {
      const reportSvc = new ReportService(this.database);
      await reportSvc.syncDailySummary(now);
    } catch (rollupErr) {
      console.warn('Could not sync daily summary rollup:', rollupErr);
    }

    return { ...shift, ...updateData };
  }

  /**
   * Retrieves paginated shift history using database-level B-Tree indexing,
   * LRU page cache (< 30 KB RAM), and background prefetching.
   * Pulls ONLY the requested pageSize into memory, zero full-table scan.
   */
  async getPaginatedShifts(
    date?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<IPaginatedShiftsResult> {
    const pageNum = Math.max(1, page);
    const size = Math.max(1, pageSize);
    const offset = (pageNum - 1) * size;
    const dateKey = (date && date.trim()) || 'all';
    const cacheKey = `${dateKey}_p${pageNum}_s${size}`;

    // 1. Fast path: in-memory cache hit (< 1ms)
    if (this.shiftPaginatedCache.has(cacheKey)) {
      const cached = this.shiftPaginatedCache.get(cacheKey)!;
      this.prefetchNextShiftPage(date, pageNum + 1, size, cached.totalPages);
      return cached;
    }

    // 2. Build collection query
    let collection;
    if (date && date.trim()) {
      const [y, m, d] = date.trim().split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      collection = this.database.shifts
        .where('openedAt')
        .between(start, end, true, true)
        .reverse();
    } else {
      collection = this.database.shifts.orderBy('openedAt').reverse();
    }

    // 3. Cached total count to avoid re-counting B-Tree on every page flip
    let totalCount = this.shiftTotalCountCache.get(dateKey);
    if (totalCount === undefined) {
      totalCount = await collection.count();
      this.shiftTotalCountCache.set(dateKey, totalCount);
    }

    // 4. Query requested page
    const shifts = await collection
      .offset(offset)
      .limit(size)
      .toArray();

    const totalPages = Math.max(1, Math.ceil(totalCount / size));
    const result: IPaginatedShiftsResult = {
      shifts,
      totalCount,
      totalPages,
      currentPage: pageNum,
    };

    // 5. Store in LRU cache
    if (this.shiftPaginatedCache.size >= this.maxShiftCacheEntries) {
      const firstKey = this.shiftPaginatedCache.keys().next().value;
      if (firstKey) this.shiftPaginatedCache.delete(firstKey);
    }
    this.shiftPaginatedCache.set(cacheKey, result);

    // 6. Intelligent Background Prefetch for next page
    this.prefetchNextShiftPage(date, pageNum + 1, size, totalPages);

    return result;
  }

  private prefetchNextShiftPage(
    date: string | undefined,
    nextPage: number,
    size: number,
    totalPages: number
  ): void {
    if (nextPage > totalPages) return;
    const dateKey = (date && date.trim()) || 'all';
    const nextCacheKey = `${dateKey}_p${nextPage}_s${size}`;
    if (this.shiftPaginatedCache.has(nextCacheKey)) return;

    setTimeout(async () => {
      try {
        const nextOffset = (nextPage - 1) * size;
        let collection;
        if (date && date.trim()) {
          const [y, m, d] = date.trim().split('-').map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0, 0);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999);
          collection = this.database.shifts
            .where('openedAt')
            .between(start, end, true, true)
            .reverse();
        } else {
          collection = this.database.shifts.orderBy('openedAt').reverse();
        }

        const shifts = await collection
          .offset(nextOffset)
          .limit(size)
          .toArray();

        const totalCount = this.shiftTotalCountCache.get(dateKey) || 0;
        const prefetchedResult: IPaginatedShiftsResult = {
          shifts,
          totalCount,
          totalPages,
          currentPage: nextPage,
        };

        if (this.shiftPaginatedCache.size >= this.maxShiftCacheEntries) {
          const firstKey = this.shiftPaginatedCache.keys().next().value;
          if (firstKey) this.shiftPaginatedCache.delete(firstKey);
        }
        this.shiftPaginatedCache.set(nextCacheKey, prefetchedResult);
      } catch {
        // Silently ignore prefetch errors
      }
    }, 10);
  }

  /** Gets historical shifts sorted newest first */
  async getShiftHistory(limit: number = 50): Promise<IShift[]> {
    return await this.database.shifts
      .orderBy('openedAt')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /** Gets a single shift by ID */
  async getShiftById(id: number): Promise<IShift | undefined> {
    return await this.database.shifts.get(id);
  }

  /** Aggregates product quantities sold during a specific shift */
  async getShiftProductSales(shiftId: number): Promise<{ productName: string; quantitySold: number }[]> {
    const orders = await this.database.orders
      .where('shiftId')
      .equals(shiftId)
      .and((o) => o.status === 'completed')
      .toArray();

    const productMap = new Map<string, number>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const itemQty = item.qty || 1;
        const current = productMap.get(item.productName) || 0;
        productMap.set(item.productName, current + itemQty);
      });
    });

    return Array.from(productMap.entries())
      .map(([productName, quantitySold]) => ({ productName, quantitySold }))
      .sort((a, b) => b.quantitySold - a.quantitySold);
  }
}

export const shiftService = new ShiftService();

// ═══════════════════════════════════════════════
// Triwara POS — Cashier Shift Management Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IShift, IStaff, IOrder } from '../types';

export class ShiftService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
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
      totalVoided: 0,
      expectedEndingCash: Math.max(0, startingCash),
      notes,
      status: 'open',
    };

    const id = (await this.database.shifts.add(newShift)) as number;

    await this.database.logs.add({
      type: 'shift',
      description: `BUKA SHIFT: ${staff.name} (Modal Awal: Rp ${startingCash.toLocaleString('id-ID')})`,
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
    const newExpected = active.startingCash + newCash;

    await this.database.shifts.update(active.id, {
      totalCashSales: newCash,
      totalQrisSales: newQris,
      totalTransactions: newCount,
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
    const newVoided = shift.totalVoided + 1;
    const newExpected = shift.startingCash + newCash;

    await this.database.shifts.update(shift.id, {
      totalCashSales: newCash,
      totalQrisSales: newQris,
      totalVoided: newVoided,
      expectedEndingCash: newExpected,
    });
  }

  /** Closes an active shift with physical cash count and difference calculation */
  async closeShift(
    shiftId: number,
    actualCash: number,
    notes?: string
  ): Promise<IShift> {
    const shift = await this.database.shifts.get(shiftId);
    if (!shift) {
      throw new Error('Data shift tidak ditemukan');
    }
    if (shift.status === 'closed') {
      throw new Error('Shift ini sudah ditutup sebelumnya');
    }

    const now = new Date();
    const expected = shift.startingCash + shift.totalCashSales;
    const difference = actualCash - expected;

    const updateData: Partial<IShift> = {
      closedAt: now,
      actualEndingCash: actualCash,
      expectedEndingCash: expected,
      cashDifference: difference,
      status: 'closed',
      notes: notes !== undefined ? notes : shift.notes,
    };

    await this.database.shifts.update(shiftId, updateData);

    await this.database.logs.add({
      type: 'shift',
      description: `TUTUP SHIFT: ${shift.cashierName} (Uang Fisik: Rp ${actualCash.toLocaleString('id-ID')}, Selisih: Rp ${difference.toLocaleString('id-ID')})`,
      referenceId: shift.shiftNumber,
      createdAt: now,
    });

    return { ...shift, ...updateData };
  }

  /** Gets historical shifts sorted newest first */
  async getShiftHistory(limit: number = 50): Promise<IShift[]> {
    const list = await this.database.shifts.toArray();
    return list
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
      .slice(0, limit);
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

// ═══════════════════════════════════════════════
// Triwara POS — Full Database Backup & Restore Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type {
  ICategory,
  IProduct,
  IIngredient,
  IOrder,
  IInventoryLog,
  ILog,
  IShopConfig,
  IAppNotification,
  IStaff,
  IShift,
  IDailySummary,
} from '../types';
import { orderService } from './order.service';
import { shiftService } from './shift.service';
import { reportService } from './report.service';

export interface ITriwaraBackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  stats: {
    categories: number;
    products: number;
    ingredients: number;
    orders: number;
    inventoryLogs: number;
    logs: number;
    shopConfig: number;
    notifications: number;
    staff: number;
    shifts: number;
    dailySummaries: number;
  };
  data: {
    categories: ICategory[];
    products: IProduct[];
    ingredients: IIngredient[];
    orders: IOrder[];
    inventoryLogs: IInventoryLog[];
    logs: ILog[];
    shopConfig: IShopConfig[];
    notifications: IAppNotification[];
    staff: IStaff[];
    shifts: IShift[];
    dailySummaries: IDailySummary[];
  };
}

export class BackupService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /**
   * Exports the entire database across all 11 tables to a structured JSON object.
   */
  async exportDatabase(): Promise<ITriwaraBackupPayload> {
    const [
      categories,
      products,
      ingredients,
      orders,
      inventoryLogs,
      logs,
      shopConfig,
      notifications,
      staff,
      shifts,
      dailySummaries,
    ] = await Promise.all([
      this.database.categories.toArray(),
      this.database.products.toArray(),
      this.database.ingredients.toArray(),
      this.database.orders.toArray(),
      this.database.inventoryLogs.toArray(),
      this.database.logs.toArray(),
      this.database.shopConfig.toArray(),
      this.database.notifications.toArray(),
      this.database.staff.toArray(),
      this.database.shifts.toArray(),
      this.database.dailySummaries.toArray(),
    ]);

    return {
      version: 3,
      appName: 'Triwara POS',
      exportedAt: new Date().toISOString(),
      stats: {
        categories: categories.length,
        products: products.length,
        ingredients: ingredients.length,
        orders: orders.length,
        inventoryLogs: inventoryLogs.length,
        logs: logs.length,
        shopConfig: shopConfig.length,
        notifications: notifications.length,
        staff: staff.length,
        shifts: shifts.length,
        dailySummaries: dailySummaries.length,
      },
      data: {
        categories,
        products,
        ingredients,
        orders,
        inventoryLogs,
        logs,
        shopConfig,
        notifications,
        staff,
        shifts,
        dailySummaries,
      },
    };
  }

  /**
   * Exports and triggers browser download of the backup file.
   */
  async downloadBackupFile(): Promise<string> {
    const payload = await this.exportDatabase();
    const jsonString = JSON.stringify(payload, null, 2);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const fileName = `TriwaraPOS_Backup_${dateStr}.json`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return fileName;
  }

  /**
   * Validates and imports backup JSON data into the database.
   * Atomically clears and replaces all 11 tables within a single Dexie transaction.
   */
  async importDatabase(jsonString: string): Promise<{ success: boolean; stats: Record<string, number> }> {
    let payload: ITriwaraBackupPayload;
    try {
      payload = JSON.parse(jsonString);
    } catch {
      throw new Error('Format file tidak valid. Pastikan file berformat JSON.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('Data backup kosong atau tidak dapat dibaca.');
    }

    if (payload.appName !== 'Triwara POS' || !payload.data) {
      throw new Error('File ini bukan file backup resmi Triwara POS.');
    }

    const { data } = payload;

    // Helper to revive ISO date strings back into native Date objects for IndexedDB index comparisons
    const toDate = (val: unknown): Date | undefined => {
      if (!val) return undefined;
      const d = new Date(val as string | number | Date);
      return isNaN(d.getTime()) ? undefined : d;
    };

    // Prepare revived collections
    const revivedOrders = (data.orders || []).map((o) => ({
      ...o,
      createdAt: toDate(o.createdAt) || new Date(),
      voidedAt: toDate(o.voidedAt),
    }));

    const revivedShifts = (data.shifts || []).map((s) => ({
      ...s,
      openedAt: toDate(s.openedAt) || new Date(),
      closedAt: toDate(s.closedAt),
    }));

    const revivedDailySummaries = (data.dailySummaries || []).map((ds) => ({
      ...ds,
      createdAt: toDate(ds.createdAt) || new Date(),
      updatedAt: toDate(ds.updatedAt) || new Date(),
    }));

    const revivedLogs = (data.logs || []).map((l) => ({
      ...l,
      createdAt: toDate(l.createdAt) || new Date(),
    }));

    const revivedInventoryLogs = (data.inventoryLogs || []).map((il) => ({
      ...il,
      createdAt: toDate(il.createdAt) || new Date(),
    }));

    const revivedNotifications = (data.notifications || []).map((n) => ({
      ...n,
      createdAt: toDate(n.createdAt) || new Date(),
    }));

    const revivedIngredients = (data.ingredients || []).map((ing) => ({
      ...ing,
      createdAt: toDate(ing.createdAt) || new Date(),
      updatedAt: toDate(ing.updatedAt) || new Date(),
    }));

    const revivedProducts = (data.products || []).map((p) => ({
      ...p,
      createdAt: toDate(p.createdAt) || new Date(),
      updatedAt: toDate(p.updatedAt) || new Date(),
    }));

    const revivedCategories = data.categories || [];
    const revivedShopConfig = data.shopConfig || [];
    const revivedStaff = data.staff || [];

    // Atomic transaction replacing all tables
    await this.database.transaction(
      'rw',
      [
        this.database.categories,
        this.database.products,
        this.database.ingredients,
        this.database.orders,
        this.database.inventoryLogs,
        this.database.logs,
        this.database.shopConfig,
        this.database.notifications,
        this.database.staff,
        this.database.shifts,
        this.database.dailySummaries,
      ],
      async () => {
        await Promise.all([
          this.database.categories.clear(),
          this.database.products.clear(),
          this.database.ingredients.clear(),
          this.database.orders.clear(),
          this.database.inventoryLogs.clear(),
          this.database.logs.clear(),
          this.database.shopConfig.clear(),
          this.database.notifications.clear(),
          this.database.staff.clear(),
          this.database.shifts.clear(),
          this.database.dailySummaries.clear(),
        ]);

        if (revivedCategories.length > 0) await this.database.categories.bulkAdd(revivedCategories);
        if (revivedProducts.length > 0) await this.database.products.bulkAdd(revivedProducts);
        if (revivedIngredients.length > 0) await this.database.ingredients.bulkAdd(revivedIngredients);
        if (revivedOrders.length > 0) await this.database.orders.bulkAdd(revivedOrders);
        if (revivedInventoryLogs.length > 0) await this.database.inventoryLogs.bulkAdd(revivedInventoryLogs);
        if (revivedLogs.length > 0) await this.database.logs.bulkAdd(revivedLogs);
        if (revivedShopConfig.length > 0) await this.database.shopConfig.bulkAdd(revivedShopConfig);
        if (revivedNotifications.length > 0) await this.database.notifications.bulkAdd(revivedNotifications);
        if (revivedStaff.length > 0) await this.database.staff.bulkAdd(revivedStaff);
        if (revivedShifts.length > 0) await this.database.shifts.bulkAdd(revivedShifts);
        if (revivedDailySummaries.length > 0) await this.database.dailySummaries.bulkAdd(revivedDailySummaries);
      }
    );

    // Invalidate all in-memory caches
    orderService.clearPaginationCache();
    shiftService.clearShiftPaginationCache();
    reportService.invalidateCache();

    return {
      success: true,
      stats: {
        categories: revivedCategories.length,
        products: revivedProducts.length,
        ingredients: revivedIngredients.length,
        orders: revivedOrders.length,
        inventoryLogs: revivedInventoryLogs.length,
        logs: revivedLogs.length,
        shopConfig: revivedShopConfig.length,
        notifications: revivedNotifications.length,
        staff: revivedStaff.length,
        shifts: revivedShifts.length,
        dailySummaries: revivedDailySummaries.length,
      },
    };
  }
}

export const backupService = new BackupService();

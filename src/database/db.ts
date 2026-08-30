// ═══════════════════════════════════════════════
// Triwara POS — Dexie IndexedDB Database Class (OOP)
// ═══════════════════════════════════════════════

import Dexie, { type EntityTable } from 'dexie';
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
} from '../types';

export class TriwaraDatabase extends Dexie {
  categories!: EntityTable<ICategory, 'id'>;
  products!: EntityTable<IProduct, 'id'>;
  ingredients!: EntityTable<IIngredient, 'id'>;
  orders!: EntityTable<IOrder, 'id'>;
  inventoryLogs!: EntityTable<IInventoryLog, 'id'>;
  logs!: EntityTable<ILog, 'id'>;
  shopConfig!: EntityTable<IShopConfig, 'id'>;
  notifications!: EntityTable<IAppNotification, 'id'>;
  staff!: EntityTable<IStaff, 'id'>;
  shifts!: EntityTable<IShift, 'id'>;

  constructor() {
    super('TriwaraPOS');

    this.version(1).stores({
      categories: '++id, name, sortOrder',
      products: '++id, categoryId, name, isActive',
      ingredients: '++id, name, category',
      orders: '++id, orderNumber, sequenceNumber, status, paymentMethod, createdAt',
      inventoryLogs: '++id, ingredientId, type, createdAt',
      logs: '++id, type, createdAt',
      shopConfig: '++id',
      notifications: '++id, type, isRead, createdAt',
    });

    this.version(2).stores({
      orders: '++id, orderNumber, sequenceNumber, status, paymentMethod, shiftId, createdAt',
      staff: '++id, pin, role, active',
      shifts: '++id, shiftNumber, cashierName, status, openedAt, closedAt',
    });
  }
}

export const db = new TriwaraDatabase();

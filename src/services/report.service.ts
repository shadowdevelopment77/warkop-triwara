// ═══════════════════════════════════════════════
// Triwara POS — Sales Report & Analytics Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { ILog } from '../types';
import { startOfDay, endOfDay } from '../utils/date';

export interface ISalesSummary {
  totalOmset: number;
  totalCash: number;
  totalQris: number;
  totalProfit: number;
  totalTransactions: number;
  completedCount: number;
  voidedCount: number;
}

export interface ITopProduct {
  productId: number;
  productName: string;
  codeBadge: string;
  quantitySold: number;
  totalRevenue: number;
}

export class ReportService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Aggregates summary sales data for a specific date range */
  async getSalesSummary(startDate: Date, endDate: Date): Promise<ISalesSummary> {
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();

    const orders = await this.database.orders
      .filter((o) => {
        const time = new Date(o.createdAt).getTime();
        return time >= start && time <= end;
      })
      .toArray();

    let totalOmset = 0;
    let totalCash = 0;
    let totalQris = 0;
    let totalProfit = 0;
    let completedCount = 0;
    let voidedCount = 0;

    for (const order of orders) {
      if (order.status === 'completed') {
        completedCount++;
        totalOmset += order.total;
        totalProfit += order.profit;

        if (order.paymentMethod === 'cash') {
          totalCash += order.total;
        } else if (order.paymentMethod === 'qris') {
          totalQris += order.total;
        }
      } else if (order.status === 'voided') {
        voidedCount++;
      }
    }

    return {
      totalOmset,
      totalCash,
      totalQris,
      totalProfit,
      totalTransactions: orders.length,
      completedCount,
      voidedCount,
    };
  }

  /** Gets top 5 best-selling products during the selected period */
  async getTopSellingProducts(startDate: Date, endDate: Date, limit: number = 5): Promise<ITopProduct[]> {
    const start = startOfDay(startDate).getTime();
    const end = endOfDay(endDate).getTime();

    const completedOrders = await this.database.orders
      .filter((o) => {
        const time = new Date(o.createdAt).getTime();
        return o.status === 'completed' && time >= start && time <= end;
      })
      .toArray();

    const productMap = new Map<number, ITopProduct>();

    for (const order of completedOrders) {
      for (const item of order.items) {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantitySold += item.qty;
          existing.totalRevenue += item.subtotal;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            codeBadge: item.codeBadge,
            quantitySold: item.qty,
            totalRevenue: item.subtotal,
          });
        }
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  }

  /** Gets system activity logs (void & restock logs) */
  async getLogs(limit: number = 100): Promise<ILog[]> {
    const logs = await this.database.logs.toArray();
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
}

export const reportService = new ReportService();

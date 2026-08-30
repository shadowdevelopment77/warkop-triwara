// ═══════════════════════════════════════════════
// Triwara POS — Sales Report & Analytics Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { ILog } from '../types';
import { startOfDay, endOfDay, formatDateIndonesian } from '../utils/date';

export interface ISalesSummary {
  totalOmset: number;
  totalCash: number;
  totalQris: number;
  totalProfit: number;
  totalTransactions: number;
  completedCount: number;
  voidedCount: number;
  totalItemsSold: number;
  topProductName: string;
  topProductQty: number;
  topProductPercentage: number;
}

export interface ITopProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface IChartDataPoint {
  label: string;
  fullLabel: string;
  omset: number;
  orderCount: number;
  isPeak?: boolean;
}

export type ChartGroupMode = 'hourly' | 'daily' | 'weekly';

export interface ISalesChartResult {
  mode: ChartGroupMode;
  modeLabel: string;
  points: IChartDataPoint[];
  peakPoint: IChartDataPoint | null;
  totalOmset: number;
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
    let totalItemsSold = 0;
    const productQtyMap = new Map<string, number>();

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

        for (const item of order.items) {
          totalItemsSold += item.qty;
          productQtyMap.set(
            item.productName,
            (productQtyMap.get(item.productName) || 0) + item.qty
          );
        }
      } else if (order.status === 'voided') {
        voidedCount++;
      }
    }

    let topProductName = '-';
    let topProductQty = 0;
    let topProductPercentage = 0;

    for (const [name, qty] of productQtyMap.entries()) {
      if (qty > topProductQty) {
        topProductName = name;
        topProductQty = qty;
      }
    }

    if (totalItemsSold > 0 && topProductQty > 0) {
      topProductPercentage = Math.round((topProductQty / totalItemsSold) * 1000) / 10;
    }

    return {
      totalOmset,
      totalCash,
      totalQris,
      totalProfit,
      totalTransactions: orders.length,
      completedCount,
      voidedCount,
      totalItemsSold,
      topProductName,
      topProductQty,
      topProductPercentage,
    };
  }

  /**
   * Generates time-series chart data points based on date range duration:
   * - <= 1 day: Hourly (00.00 - 24.00)
   * - > 1 day & <= 7 days: Daily
   * - >= 8 days & <= 31 days: Weekly (Minggu 1, 2, 3, 4)
   */
  async getSalesChartData(startDate: Date, endDate: Date): Promise<ISalesChartResult> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const completedOrders = await this.database.orders
      .filter((o) => {
        const time = new Date(o.createdAt).getTime();
        return o.status === 'completed' && time >= start.getTime() && time <= end.getTime();
      })
      .toArray();

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    let mode: ChartGroupMode = 'hourly';
    let modeLabel = 'Per Jam (00:00 - 24:00)';
    let points: IChartDataPoint[] = [];

    if (diffDays <= 1) {
      // ─── Mode 1: Harian (24 jam dari 00:00 - 24:00) ───
      mode = 'hourly';
      modeLabel = 'Per Jam (00:00 - 24:00)';

      for (let h = 0; h < 24; h++) {
        const hourStr = h.toString().padStart(2, '0');
        const nextHourStr = ((h + 1) % 24).toString().padStart(2, '0');
        points.push({
          label: `${hourStr}:00`,
          fullLabel: `Pukul ${hourStr}:00 - ${nextHourStr}:00`,
          omset: 0,
          orderCount: 0,
        });
      }

      for (const order of completedOrders) {
        const orderHour = new Date(order.createdAt).getHours();
        if (orderHour >= 0 && orderHour < 24) {
          points[orderHour].omset += order.total;
          points[orderHour].orderCount += 1;
        }
      }
    } else if (diffDays <= 7) {
      // ─── Mode 2: > 1 hari && <= 7 hari (Per Hari) ───
      mode = 'daily';
      modeLabel = `Per Hari (${diffDays} Hari)`;

      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const cur = new Date(start);

      while (cur <= end) {
        const d = new Date(cur);
        const dayName = dayNames[d.getDay()];
        const dateNum = d.getDate().toString().padStart(2, '0');
        const monthNum = (d.getMonth() + 1).toString().padStart(2, '0');

        points.push({
          label: `${dayName} ${dateNum}/${monthNum}`,
          fullLabel: formatDateIndonesian(d),
          omset: 0,
          orderCount: 0,
        });

        cur.setDate(cur.getDate() + 1);
      }

      for (const order of completedOrders) {
        const orderDate = startOfDay(new Date(order.createdAt));
        const dayIdx = Math.round((orderDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIdx >= 0 && dayIdx < points.length) {
          points[dayIdx].omset += order.total;
          points[dayIdx].orderCount += 1;
        }
      }
    } else {
      // ─── Mode 3: >= 8 hari && <= 1 bulan / bulanan (Per Minggu) ───
      mode = 'weekly';
      modeLabel = 'Per Minggu';

      points = [
        { label: 'Minggu 1', fullLabel: 'Minggu 1 (Tgl 1 - 7)', omset: 0, orderCount: 0 },
        { label: 'Minggu 2', fullLabel: 'Minggu 2 (Tgl 8 - 14)', omset: 0, orderCount: 0 },
        { label: 'Minggu 3', fullLabel: 'Minggu 3 (Tgl 15 - 21)', omset: 0, orderCount: 0 },
        { label: 'Minggu 4', fullLabel: 'Minggu 4 (Tgl 22 - Akhir)', omset: 0, orderCount: 0 },
      ];

      for (const order of completedOrders) {
        const day = new Date(order.createdAt).getDate();
        let weekIdx = 0;
        if (day <= 7) weekIdx = 0;
        else if (day <= 14) weekIdx = 1;
        else if (day <= 21) weekIdx = 2;
        else weekIdx = 3;

        points[weekIdx].omset += order.total;
        points[weekIdx].orderCount += 1;
      }
    }

    // Find peak period
    let peakPoint: IChartDataPoint | null = null;
    let maxOmset = 0;
    let totalOmset = 0;

    for (const pt of points) {
      totalOmset += pt.omset;
      if (pt.omset > maxOmset) {
        maxOmset = pt.omset;
        peakPoint = pt;
      }
    }

    if (peakPoint && peakPoint.omset > 0) {
      peakPoint.isPeak = true;
    }

    return {
      mode,
      modeLabel,
      points,
      peakPoint: peakPoint && peakPoint.omset > 0 ? peakPoint : null,
      totalOmset,
    };
  }

  /** Gets top best-selling products during the selected period */
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
            quantitySold: item.qty,
            totalRevenue: item.subtotal,
          });
        }
      }
    }

    const sorted = Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);
    return limit > 0 ? sorted.slice(0, limit) : sorted;
  }

  /** Gets system activity logs (void & restock logs) */
  async getLogs(limit: number = 100): Promise<ILog[]> {
    const logs = await this.database.logs.toArray();
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
}

export const reportService = new ReportService();

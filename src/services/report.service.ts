// ═══════════════════════════════════════════════
// Triwara POS — Sales Report & Analytics Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { ILog, IDailySummary, IDailyProductSale, IOrder } from '../types';
import { startOfDay, endOfDay, formatDateIndonesian, toInputDateString } from '../utils/date';

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

export type ChartGroupMode = 'hourly' | 'interval' | 'daily' | 'weekly' | 'monthly';

export interface ISalesChartResult {
  mode: ChartGroupMode;
  modeLabel: string;
  points: IChartDataPoint[];
  peakPoint: IChartDataPoint | null;
  totalOmset: number;
}

export interface IPaginatedLogsResult {
  logs: ILog[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface IReportBundle {
  summary: ISalesSummary;
  topProducts: ITopProduct[];
  chart: ISalesChartResult;
}

export class ReportService {
  private database: TriwaraDatabase;
  private periodCache = new Map<string, { data: IReportBundle; timestamp: number }>();
  private logPaginatedCache = new Map<string, IPaginatedLogsResult>();
  private logTotalCountCache = new Map<string, number>();
  private readonly maxLogCacheEntries = 20;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Clears the in-memory report query cache and log pagination cache */
  invalidateCache(): void {
    this.periodCache.clear();
    this.clearLogPaginationCache();
  }

  /** Clears log pagination cache */
  clearLogPaginationCache(): void {
    this.logPaginatedCache.clear();
    this.logTotalCountCache.clear();
  }

  /**
   * Retrieves full report bundle (Summary Cards + Top Products + Chart) in one unified call.
   * Leverages in-memory cache for 0ms re-queries and pre-computed tables.
   */
  async getReportBundle(startDate: Date, endDate: Date): Promise<IReportBundle> {
    const key = `${toInputDateString(startDate)}_${toInputDateString(endDate)}`;
    const now = Date.now();
    const cached = this.periodCache.get(key);

    const todayStart = startOfDay(new Date());
    const isHistorical = endOfDay(endDate).getTime() < todayStart.getTime();

    // Cache HIT: historical date ranges are immutable; today's ranges have 15s TTL
    if (cached) {
      if (isHistorical || now - cached.timestamp < 15000) {
        return cached.data;
      }
    }

    // Pre-fetch today's live orders ONCE in memory if date range covers today
    let todayOrders: IOrder[] | undefined;
    if (endOfDay(endDate) >= todayStart) {
      const todayQueryStart = startDate > todayStart ? startDate : todayStart;
      todayOrders = await this.database.orders
        .where('createdAt')
        .between(todayQueryStart, endOfDay(endDate), true, true)
        .toArray();
    }

    const [summary, topProducts, chart] = await Promise.all([
      this.getSalesSummary(startDate, endDate, todayOrders),
      this.getTopSellingProducts(startDate, endDate, 5, todayOrders),
      this.getSalesChartData(startDate, endDate, todayOrders),
    ]);

    const bundle: IReportBundle = { summary, topProducts, chart };
    this.periodCache.set(key, { data: bundle, timestamp: now });
    return bundle;
  }

  /** Aggregates summary sales data using Pre-computed Rollup with Live Fallback */
  async getSalesSummary(startDate: Date, endDate: Date, preloadedTodayOrders?: IOrder[]): Promise<ISalesSummary> {
    const today = new Date();
    const todayStart = startOfDay(today);
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    let totalOmset = 0;
    let totalCash = 0;
    let totalQris = 0;
    let totalProfit = 0;
    let completedCount = 0;
    let voidedCount = 0;
    let totalItemsSold = 0;
    const productQtyMap = new Map<string, number>();

    // 1. Direct query dailySummaries for the full range (including today)
    const summaries = await this.getDailySummariesRange(start, end);
    const summaryMap = new Map<string, IDailySummary>();

    for (const s of summaries) {
      summaryMap.set(s.date, s);
      completedCount += s.completedCount;
      voidedCount += s.voidedCount || 0;
      totalOmset += s.totalOmset;
      totalProfit += s.totalProfit;
      totalCash += s.totalCash;
      totalQris += s.totalQris;
      totalItemsSold += s.totalItemsSold;

      if (s.productSales) {
        for (const item of Object.values(s.productSales)) {
          productQtyMap.set(
            item.productName,
            (productQtyMap.get(item.productName) || 0) + item.quantitySold
          );
        }
      }
    }

    // 2. If range includes today and today is not yet synced in dailySummaries, fallback to today's live orders
    const todayKey = toInputDateString(today);
    if (end >= todayStart && start <= end && !summaryMap.has(todayKey)) {
      const todayQueryStart = start > todayStart ? start : todayStart;
      const todayOrders = preloadedTodayOrders ?? await this.database.orders
        .where('createdAt')
        .between(todayQueryStart, end, true, true)
        .toArray();

      for (const order of todayOrders) {
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
    }

    // 3. Fallback: If no summaries exist at all in the database (legacy or initial seed)
    if (summaries.length === 0 && (end < todayStart || start > end)) {
      const legacyOrders = await this.database.orders
        .where('createdAt')
        .between(start, end, true, true)
        .toArray();

      for (const order of legacyOrders) {
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
      totalTransactions: completedCount + voidedCount,
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
  async getSalesChartData(startDate: Date, endDate: Date, preloadedTodayOrders?: IOrder[]): Promise<ISalesChartResult> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
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

      const completedOrders = (preloadedTodayOrders ?? await this.database.orders
        .where('createdAt')
        .between(start, end, true, true)
        .toArray()).filter((o) => o.status === 'completed');

      for (const order of completedOrders) {
        const orderHour = new Date(order.createdAt).getHours();
        if (orderHour >= 0 && orderHour < 24) {
          points[orderHour].omset += order.total;
          points[orderHour].orderCount += 1;
        }
      }
    } else if (diffDays <= 7) {
      // ─── Mode 2: 2 s/d 7 Hari (Per 4 Jam: 6 Blok per Hari) ───
      mode = 'interval';
      modeLabel = `Per 4 Jam (${diffDays} Hari)`;

      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const slotLabels = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
      const slotFullLabels = [
        'Pukul 00:00 - 04:00 (Dini Hari)',
        'Pukul 04:00 - 08:00 (Subuh/Pagi)',
        'Pukul 08:00 - 12:00 (Pagi)',
        'Pukul 12:00 - 16:00 (Siang)',
        'Pukul 16:00 - 20:00 (Sore)',
        'Pukul 20:00 - 24:00 (Malam)',
      ];

      const cur = new Date(start);
      while (cur <= end) {
        const d = new Date(cur);
        const dayName = dayNames[d.getDay()];

        for (let s = 0; s < 6; s++) {
          points.push({
            label: `${dayName} ${slotLabels[s]}`,
            fullLabel: `${dayName}, ${formatDateIndonesian(d)} • ${slotFullLabels[s]}`,
            omset: 0,
            orderCount: 0,
          });
        }
        cur.setDate(cur.getDate() + 1);
      }

      const completedOrders = (await this.database.orders
        .where('createdAt')
        .between(start, end, true, true)
        .toArray()).filter((o) => o.status === 'completed');

      for (const order of completedOrders) {
        const orderDate = startOfDay(new Date(order.createdAt));
        const dayIdx = Math.round((orderDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const slotIdx = Math.min(5, Math.floor(new Date(order.createdAt).getHours() / 4));
        const ptIdx = dayIdx * 6 + slotIdx;
        if (ptIdx >= 0 && ptIdx < points.length) {
          points[ptIdx].omset += order.total;
          points[ptIdx].orderCount += 1;
        }
      }
    } else if (diffDays <= 31) {
      // ─── Mode 3: 8 s/d 31 Hari / Bulanan (Per Hari / Tanggal) ───
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
          label: `${dateNum}/${monthNum}`,
          fullLabel: `${dayName}, ${formatDateIndonesian(d)}`,
          omset: 0,
          orderCount: 0,
        });

        cur.setDate(cur.getDate() + 1);
      }

      // Read pre-computed dailySummaries (< 1ms)
      const summaries = await this.getDailySummariesRange(start, end);
      const summaryMap = new Map<string, IDailySummary>();
      summaries.forEach((s) => summaryMap.set(s.date, s));

      const today = new Date();
      const todayStart = startOfDay(today);
      let todayOrders: IOrder[] = [];
      if (end >= todayStart) {
        todayOrders = (preloadedTodayOrders ?? await this.database.orders
          .where('createdAt')
          .between(todayStart, end, true, true)
          .toArray()).filter((o) => o.status === 'completed');
      }

      const pointCur = new Date(start);
      for (let i = 0; i < points.length; i++) {
        const dateKey = toInputDateString(pointCur);
        const s = summaryMap.get(dateKey);
        if (s) {
          points[i].omset = s.totalOmset;
          points[i].orderCount = s.completedCount;
        }
        if (dateKey === toInputDateString(today) && todayOrders.length > 0) {
          points[i].omset = todayOrders.reduce((sum, o) => sum + o.total, 0);
          points[i].orderCount = todayOrders.length;
        }
        pointCur.setDate(pointCur.getDate() + 1);
      }

      // Fallback if no summaries exist
      if (summaries.length === 0 && todayOrders.length === 0) {
        const fallbackOrders = (await this.database.orders
          .where('createdAt')
          .between(start, end, true, true)
          .toArray()).filter((o) => o.status === 'completed');
        for (const order of fallbackOrders) {
          const orderDate = startOfDay(new Date(order.createdAt));
          const dayIdx = Math.round((orderDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (dayIdx >= 0 && dayIdx < points.length) {
            points[dayIdx].omset += order.total;
            points[dayIdx].orderCount += 1;
          }
        }
      }
    } else if (diffDays <= 90) {
      // ─── Mode 4: 32 s/d 90 Hari (Per Minggu) ───
      mode = 'weekly';
      const totalWeeks = Math.ceil(diffDays / 7);
      modeLabel = `Per Minggu (${totalWeeks} Minggu)`;

      for (let w = 0; w < totalWeeks; w++) {
        const wStart = new Date(start.getTime() + w * 7 * 86400000);
        const wEnd = new Date(Math.min(end.getTime(), start.getTime() + (w + 1) * 7 * 86400000 - 1000));
        points.push({
          label: `Mgg ${w + 1}`,
          fullLabel: `Minggu ${w + 1} (${wStart.getDate()}/${wStart.getMonth() + 1} - ${wEnd.getDate()}/${wEnd.getMonth() + 1})`,
          omset: 0,
          orderCount: 0,
        });
      }

      const summaries = await this.getDailySummariesRange(start, end);
      for (const s of summaries) {
        const sTime = new Date(s.date).getTime();
        const weekIdx = Math.min(points.length - 1, Math.floor((sTime - start.getTime()) / (7 * 86400000)));
        if (weekIdx >= 0 && weekIdx < points.length) {
          points[weekIdx].omset += s.totalOmset;
          points[weekIdx].orderCount += s.completedCount;
        }
      }

      // Fallback
      if (summaries.length === 0) {
        const fallbackOrders = (await this.database.orders
          .where('createdAt')
          .between(start, end, true, true)
          .toArray()).filter((o) => o.status === 'completed');
        for (const order of fallbackOrders) {
          const orderTime = new Date(order.createdAt).getTime();
          const weekIdx = Math.min(points.length - 1, Math.floor((orderTime - start.getTime()) / (7 * 86400000)));
          if (weekIdx >= 0 && weekIdx < points.length) {
            points[weekIdx].omset += order.total;
            points[weekIdx].orderCount += 1;
          }
        }
      }
    } else {
      // ─── Mode 5: > 90 Hari / Tahunan (Per Bulan: Jan - Des) ───
      mode = 'monthly';
      modeLabel = 'Per Bulan (Tahunan)';

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const fullMonthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      const curMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (curMonth <= endMonth) {
        const m = curMonth.getMonth();
        const y = curMonth.getFullYear();
        points.push({
          label: `${monthNames[m]} '${String(y).slice(-2)}`,
          fullLabel: `${fullMonthNames[m]} ${y}`,
          omset: 0,
          orderCount: 0,
        });
        curMonth.setMonth(curMonth.getMonth() + 1);
      }

      const summaries = await this.getDailySummariesRange(start, end);
      for (const s of summaries) {
        const sDate = new Date(s.date);
        const mIdx = (sDate.getFullYear() - start.getFullYear()) * 12 + (sDate.getMonth() - start.getMonth());
        if (mIdx >= 0 && mIdx < points.length) {
          points[mIdx].omset += s.totalOmset;
          points[mIdx].orderCount += s.completedCount;
        }
      }

      // Fallback
      if (summaries.length === 0) {
        const fallbackOrders = (await this.database.orders
          .where('createdAt')
          .between(start, end, true, true)
          .toArray()).filter((o) => o.status === 'completed');
        for (const order of fallbackOrders) {
          const oDate = new Date(order.createdAt);
          const mIdx = (oDate.getFullYear() - start.getFullYear()) * 12 + (oDate.getMonth() - start.getMonth());
          if (mIdx >= 0 && mIdx < points.length) {
            points[mIdx].omset += order.total;
            points[mIdx].orderCount += 1;
          }
        }
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

  /** Gets top best-selling products using Pre-computed Rollup with Live Fallback */
  async getTopSellingProducts(startDate: Date, endDate: Date, limit: number = 5, preloadedTodayOrders?: IOrder[]): Promise<ITopProduct[]> {
    const today = new Date();
    const todayStart = startOfDay(today);
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const productMap = new Map<number | string, ITopProduct>();

    // 1. Direct query dailySummaries for the full range (including today)
    const summaries = await this.getDailySummariesRange(start, end);
    const summaryMap = new Map<string, IDailySummary>();

    for (const s of summaries) {
      summaryMap.set(s.date, s);
      if (s.productSales) {
        for (const item of Object.values(s.productSales)) {
          const key = item.productId || item.productName;
          const existing = productMap.get(key);
          if (existing) {
            existing.quantitySold += item.quantitySold;
            existing.totalRevenue += item.totalRevenue;
          } else {
            productMap.set(key, {
              productId: item.productId,
              productName: item.productName,
              quantitySold: item.quantitySold,
              totalRevenue: item.totalRevenue,
            });
          }
        }
      }
    }

    // 2. If range includes today and today is not yet in dailySummaries, fallback to today's live orders
    const todayKey = toInputDateString(today);
    if (end >= todayStart && start <= end && !summaryMap.has(todayKey)) {
      const todayQueryStart = start > todayStart ? start : todayStart;
      const todayOrders = (preloadedTodayOrders ?? await this.database.orders
        .where('createdAt')
        .between(todayQueryStart, end, true, true)
        .toArray()).filter((o) => o.status === 'completed');

      for (const order of todayOrders) {
        for (const item of order.items) {
          const key = item.productId || item.productName;
          const existing = productMap.get(key);
          if (existing) {
            existing.quantitySold += item.qty;
            existing.totalRevenue += item.subtotal;
          } else {
            productMap.set(key, {
              productId: item.productId,
              productName: item.productName,
              quantitySold: item.qty,
              totalRevenue: item.subtotal,
            });
          }
        }
      }
    }

    // 3. Fallback: If no summaries existed at all
    if (summaries.length === 0 && (end < todayStart || start > end)) {
      const legacyOrders = (await this.database.orders
        .where('createdAt')
        .between(start, end, true, true)
        .toArray()).filter((o) => o.status === 'completed');

      for (const order of legacyOrders) {
        for (const item of order.items) {
          const key = item.productId || item.productName;
          const existing = productMap.get(key);
          if (existing) {
            existing.quantitySold += item.qty;
            existing.totalRevenue += item.subtotal;
          } else {
            productMap.set(key, {
              productId: item.productId,
              productName: item.productName,
              quantitySold: item.qty,
              totalRevenue: item.subtotal,
            });
          }
        }
      }
    }

    const sorted = Array.from(productMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);
    return limit > 0 ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Pure calculation helper: transforms an array of orders into an IDailySummary structure.
   * Zero direct database calls.
   */
  private aggregateOrders(orders: IOrder[], dateKey: string, existingCreatedAt?: Date): IDailySummary {
    const completed = orders.filter((o) => o.status === 'completed');
    const voided = orders.filter((o) => o.status === 'voided');

    const totalOmset = completed.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalProfit = completed.reduce((sum, o) => sum + (o.profit || 0), 0);
    const totalCash = completed
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const totalQris = completed
      .filter((o) => o.paymentMethod === 'qris')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const productSalesMap: Record<string, IDailyProductSale> = {};
    let totalItemsSold = 0;

    completed.forEach((order) => {
      order.items.forEach((item) => {
        const qty = item.qty || 1;
        const rev = item.subtotal || 0;
        totalItemsSold += qty;
        const key = String(item.productId || item.productName);
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            productId: item.productId || 0,
            productName: item.productName,
            quantitySold: 0,
            totalRevenue: 0,
          };
        }
        productSalesMap[key].quantitySold += qty;
        productSalesMap[key].totalRevenue += rev;
      });
    });

    let topProductName = '-';
    let topProductQty = 0;
    Object.values(productSalesMap).forEach((p) => {
      if (p.quantitySold > topProductQty) {
        topProductQty = p.quantitySold;
        topProductName = p.productName;
      }
    });

    const topProductPercentage =
      totalItemsSold > 0 ? Math.round((topProductQty / totalItemsSold) * 100) : 0;

    return {
      date: dateKey,
      totalOmset,
      totalProfit,
      totalCash,
      totalQris,
      completedCount: completed.length,
      voidedCount: voided.length,
      totalItemsSold,
      topProductName,
      topProductPercentage,
      productSales: productSalesMap,
      createdAt: existingCreatedAt || new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generates or updates the daily rollup summary for a specific calendar date.
   * Runs in milliseconds and saves an aggregated snapshot to dailySummaries table.
   */
  async syncDailySummary(targetDate: Date): Promise<IDailySummary> {
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    const dateKey = toInputDateString(targetDate);

    const dayOrders = await this.database.orders
      .where('createdAt')
      .between(start, end, true, true)
      .toArray();

    const existing = await this.database.dailySummaries.where('date').equals(dateKey).first();
    const summaryData = this.aggregateOrders(dayOrders, dateKey, existing?.createdAt);

    if (existing && existing.id) {
      summaryData.id = existing.id;
      await this.database.dailySummaries.put(summaryData);
    } else {
      const id = await this.database.dailySummaries.add(summaryData);
      summaryData.id = id as number;
    }

    this.invalidateCache();
    return summaryData;
  }

  /**
   * Real-time background rollup: increments today's daily summary on each checkout.
   * Eliminates the need to query raw orders table for today's reports.
   */
  async recordOrderToDailySummary(order: IOrder): Promise<void> {
    if (order.status !== 'completed') return;
    const dateKey = toInputDateString(order.createdAt ? new Date(order.createdAt) : new Date());
    const existing = await this.database.dailySummaries.where('date').equals(dateKey).first();

    const isCash = order.paymentMethod === 'cash';
    const isQris = order.paymentMethod === 'qris';
    const orderOmset = order.total || 0;
    const orderProfit = order.profit || 0;

    let itemsCount = 0;
    const salesMap: Record<string, IDailyProductSale> = existing?.productSales ? { ...existing.productSales } : {};

    for (const item of order.items) {
      const qty = item.qty || 1;
      const rev = item.subtotal || 0;
      itemsCount += qty;
      const key = String(item.productId || item.productName);
      if (!salesMap[key]) {
        salesMap[key] = {
          productId: item.productId || 0,
          productName: item.productName,
          quantitySold: 0,
          totalRevenue: 0,
        };
      }
      salesMap[key].quantitySold += qty;
      salesMap[key].totalRevenue += rev;
    }

    let topName = existing?.topProductName || '-';
    let topQty = 0;
    for (const p of Object.values(salesMap)) {
      if (p.quantitySold > topQty) {
        topQty = p.quantitySold;
        topName = p.productName;
      }
    }

    const newTotalItems = (existing?.totalItemsSold || 0) + itemsCount;
    const topPct = newTotalItems > 0 ? Math.round((topQty / newTotalItems) * 100) : 0;

    if (existing && existing.id) {
      await this.database.dailySummaries.update(existing.id, {
        totalOmset: (existing.totalOmset || 0) + orderOmset,
        totalProfit: (existing.totalProfit || 0) + orderProfit,
        totalCash: (existing.totalCash || 0) + (isCash ? orderOmset : 0),
        totalQris: (existing.totalQris || 0) + (isQris ? orderOmset : 0),
        completedCount: (existing.completedCount || 0) + 1,
        totalItemsSold: newTotalItems,
        topProductName: topName,
        topProductPercentage: topPct,
        productSales: salesMap,
        updatedAt: new Date(),
      });
    } else {
      await this.database.dailySummaries.add({
        date: dateKey,
        totalOmset: orderOmset,
        totalProfit: orderProfit,
        totalCash: isCash ? orderOmset : 0,
        totalQris: isQris ? orderOmset : 0,
        completedCount: 1,
        voidedCount: 0,
        totalItemsSold: newTotalItems,
        topProductName: topName,
        topProductPercentage: topPct,
        productSales: salesMap,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.invalidateCache();
  }

  /**
   * Real-time background rollup: adjusts daily summary when an order is voided.
   */
  async recordVoidToDailySummary(order: IOrder): Promise<void> {
    const dateKey = toInputDateString(order.createdAt ? new Date(order.createdAt) : new Date());
    const existing = await this.database.dailySummaries.where('date').equals(dateKey).first();
    if (!existing || !existing.id) return;

    const isCash = order.paymentMethod === 'cash';
    const isQris = order.paymentMethod === 'qris';
    const orderOmset = order.total || 0;
    const orderProfit = order.profit || 0;

    let itemsToDeduct = 0;
    const salesMap: Record<string, IDailyProductSale> = { ...existing.productSales };

    for (const item of order.items) {
      const qty = item.qty || 1;
      const rev = item.subtotal || 0;
      itemsToDeduct += qty;
      const key = String(item.productId || item.productName);
      if (salesMap[key]) {
        salesMap[key].quantitySold = Math.max(0, salesMap[key].quantitySold - qty);
        salesMap[key].totalRevenue = Math.max(0, salesMap[key].totalRevenue - rev);
      }
    }

    let topName = '-';
    let topQty = 0;
    for (const p of Object.values(salesMap)) {
      if (p.quantitySold > topQty) {
        topQty = p.quantitySold;
        topName = p.productName;
      }
    }

    const newTotalItems = Math.max(0, (existing.totalItemsSold || 0) - itemsToDeduct);
    const topPct = newTotalItems > 0 ? Math.round((topQty / newTotalItems) * 100) : 0;

    await this.database.dailySummaries.update(existing.id, {
      totalOmset: Math.max(0, (existing.totalOmset || 0) - orderOmset),
      totalProfit: Math.max(0, (existing.totalProfit || 0) - orderProfit),
      totalCash: Math.max(0, (existing.totalCash || 0) - (isCash ? orderOmset : 0)),
      totalQris: Math.max(0, (existing.totalQris || 0) - (isQris ? orderOmset : 0)),
      completedCount: Math.max(0, (existing.completedCount || 0) - 1),
      voidedCount: (existing.voidedCount || 0) + 1,
      totalItemsSold: newTotalItems,
      topProductName: topName,
      topProductPercentage: topPct,
      productSales: salesMap,
      updatedAt: new Date(),
    });

    this.invalidateCache();
  }

  /**
   * Retrieves a single daily rollup summary by YYYY-MM-DD key.
   */
  async getDailySummary(dateKey: string): Promise<IDailySummary | null> {
    const found = await this.database.dailySummaries.where('date').equals(dateKey).first();
    return found || null;
  }

  /**
   * Retrieves multiple daily rollup summaries within a date range.
   */
  async getDailySummariesRange(startDate: Date, endDate: Date): Promise<IDailySummary[]> {
    const startKey = toInputDateString(startDate);
    const endKey = toInputDateString(endDate);
    return await this.database.dailySummaries
      .where('date')
      .between(startKey, endKey, true, true)
      .toArray();
  }

  private resolveLogDateRange(
    dateOrStartDate?: string | Date,
    endDate?: Date
  ): { start: Date | null; end: Date | null; dateKey: string } {
    if (dateOrStartDate instanceof Date) {
      const start = dateOrStartDate;
      const end = endDate instanceof Date ? endDate : new Date(start.getTime() + 86400000 - 1);
      const dateKey = `${toInputDateString(start)}_${toInputDateString(end)}`;
      return { start, end, dateKey };
    }
    if (typeof dateOrStartDate === 'string' && dateOrStartDate.trim()) {
      const [y, m, d] = dateOrStartDate.trim().split('-').map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      return { start, end, dateKey: dateOrStartDate.trim() };
    }
    return { start: null, end: null, dateKey: 'all' };
  }

  private getLogQuery(type?: string, start?: Date | null, end?: Date | null) {
    const hasType = Boolean(type && type !== 'all');
    let collection;

    if (start && end) {
      collection = this.database.logs
        .where('createdAt')
        .between(start, end, true, true)
        .reverse();
    } else {
      collection = this.database.logs.orderBy('createdAt').reverse();
    }

    if (hasType) {
      if (type === 'inventory') {
        collection = collection.filter((l) => l.type === 'inventory' || l.type === 'restock');
      } else {
        collection = collection.filter((l) => l.type === type);
      }
    }

    return collection;
  }

  /**
   * Retrieves paginated activity logs using database-level B-Tree indexing,
   * LRU page cache (< 40 KB RAM), and background prefetching.
   * Pulls ONLY the requested pageSize into memory, zero full-table scan.
   */
  async getPaginatedLogs(
    type?: string,
    dateOrStartDate?: string | Date,
    pageOrEndDate?: number | Date,
    pageSizeOrPage: number = 10,
    optionalPageSize: number = 10
  ): Promise<IPaginatedLogsResult> {
    let resolvedEndDate: Date | undefined;
    let page = 1;
    let pageSize = 10;

    if (dateOrStartDate instanceof Date) {
      if (pageOrEndDate instanceof Date) {
        resolvedEndDate = pageOrEndDate;
        page = pageSizeOrPage;
        pageSize = optionalPageSize;
      } else if (typeof pageOrEndDate === 'number') {
        page = pageOrEndDate;
        pageSize = pageSizeOrPage;
      }
    } else {
      if (typeof pageOrEndDate === 'number') {
        page = pageOrEndDate;
        pageSize = pageSizeOrPage;
      }
    }

    const { start, end, dateKey } = this.resolveLogDateRange(dateOrStartDate, resolvedEndDate);
    const pageNum = Math.max(1, page);
    const size = Math.max(1, pageSize);
    const offset = (pageNum - 1) * size;
    const filterKey = `${type || 'all'}_${dateKey}`;
    const cacheKey = `${filterKey}_p${pageNum}_s${size}`;

    // 1. Fast path: in-memory cache hit (< 1ms)
    if (this.logPaginatedCache.has(cacheKey)) {
      const cached = this.logPaginatedCache.get(cacheKey)!;
      this.prefetchNextLogPage(type, start, end, filterKey, pageNum + 1, size, cached.totalPages);
      return cached;
    }

    // 2. Build collection query
    const collection = this.getLogQuery(type, start, end);

    // 3. Cached total count to avoid re-counting B-Tree on every page flip
    let totalCount = this.logTotalCountCache.get(filterKey);
    if (totalCount === undefined) {
      totalCount = await collection.count();
      this.logTotalCountCache.set(filterKey, totalCount);
    }

    // 4. Query requested page
    const logs = await collection
      .offset(offset)
      .limit(size)
      .toArray();

    const totalPages = Math.max(1, Math.ceil(totalCount / size));
    const result: IPaginatedLogsResult = {
      logs,
      totalCount,
      totalPages,
      currentPage: pageNum,
    };

    // 5. Store in LRU cache (< 40 KB RAM cap)
    if (this.logPaginatedCache.size >= this.maxLogCacheEntries) {
      const firstKey = this.logPaginatedCache.keys().next().value;
      if (firstKey) this.logPaginatedCache.delete(firstKey);
    }
    this.logPaginatedCache.set(cacheKey, result);

    // 6. Intelligent Background Prefetch for next page
    this.prefetchNextLogPage(type, start, end, filterKey, pageNum + 1, size, totalPages);

    return result;
  }

  private prefetchNextLogPage(
    type: string | undefined,
    start: Date | null,
    end: Date | null,
    filterKey: string,
    nextPage: number,
    size: number,
    totalPages: number
  ): void {
    if (nextPage > totalPages) return;
    const nextCacheKey = `${filterKey}_p${nextPage}_s${size}`;
    if (this.logPaginatedCache.has(nextCacheKey)) return;

    setTimeout(async () => {
      try {
        const nextOffset = (nextPage - 1) * size;
        const collection = this.getLogQuery(type, start, end);
        const logs = await collection
          .offset(nextOffset)
          .limit(size)
          .toArray();

        const totalCount = this.logTotalCountCache.get(filterKey) || 0;
        const prefetchedResult: IPaginatedLogsResult = {
          logs,
          totalCount,
          totalPages,
          currentPage: nextPage,
        };

        if (this.logPaginatedCache.size >= this.maxLogCacheEntries) {
          const firstKey = this.logPaginatedCache.keys().next().value;
          if (firstKey) this.logPaginatedCache.delete(firstKey);
        }
        this.logPaginatedCache.set(nextCacheKey, prefetchedResult);
      } catch {
        // Silently ignore background prefetch errors
      }
    }, 10);
  }

  /** Gets system activity logs using reverse indexed limit (zero full scan) */
  async getLogs(limit: number = 100): Promise<ILog[]> {
    return await this.database.logs
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
  }
}

export const reportService = new ReportService();

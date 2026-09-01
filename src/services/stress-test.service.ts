// ═══════════════════════════════════════════════
// Triwara POS — High-Performance Stress Test & Benchmark Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IOrder, IDailySummary, IDailyProductSale } from '../types';
import { orderService } from './order.service';
import { reportService } from './report.service';
import { toInputDateString } from '../utils/date';

export interface IStressProgress {
  current: number;
  total: number;
  percent: number;
  speedTrxPerSec: number;
  elapsedSeconds: number;
}

export interface IBenchmarkResult {
  totalOrders: number;
  storageEstimateMb: number;
  paginationLatencyMs: number;
  reportLatencyMs: number;
}

export class StressTestService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /**
   * Generates realistic dummy orders in chunked async batches.
   * Updates dailySummaries rollup tables concurrently to test real-world throughput.
   */
  async generateDummyOrders(
    targetCount: number,
    onProgress?: (progress: IStressProgress) => void
  ): Promise<{ durationMs: number; totalCreated: number }> {
    // Acquire Screen WakeLock if available so mobile screens don't sleep
    let wakeLock: any = null;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // Ignore if unsupported or denied
      }
    }

    const startTime = performance.now();
    const batchSize = Math.min(2000, targetCount);
    let created = 0;

    const sampleProducts = [
      { id: 1, name: 'Kopi Susu Gula Aren', price: 18000, hpp: 6500 },
      { id: 2, name: 'Americano Ice', price: 15000, hpp: 4500 },
      { id: 3, name: 'Caffe Latte', price: 22000, hpp: 8000 },
      { id: 4, name: 'Matcha Latte', price: 24000, hpp: 9000 },
      { id: 5, name: 'V60 Single Origin', price: 28000, hpp: 11000 },
      { id: 6, name: 'Croissant Butter', price: 20000, hpp: 9000 },
      { id: 7, name: 'Roti Bakar Coklat Keju', price: 16000, hpp: 6000 },
      { id: 8, name: 'Kentang Goreng Original', price: 15000, hpp: 5000 },
    ];

    const customerNames = [
      'Pelanggan Setia', 'Dedi Kurniawan', 'Siti Rahma', 'Budi Santoso',
      'Rian Pratama', 'Ayu Lestari', 'Dimas Anggara', 'Maya Indah'
    ];

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const maxPastDays = 365;

    // Track daily rollup aggregations in-memory across the batch
    const dailyRollupMap = new Map<string, {
      totalOmset: number;
      totalProfit: number;
      totalCash: number;
      totalQris: number;
      completedCount: number;
      voidedCount: number;
      totalItemsSold: number;
      productSales: Record<string, IDailyProductSale>;
    }>();

    while (created < targetCount) {
      const currentBatchSize = Math.min(batchSize, targetCount - created);
      const ordersChunk: IOrder[] = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const globalIdx = created + i + 1;
        // 20% of orders are created for today so default "Hari Ini" filter shows data immediately
        const isToday = Math.random() < 0.2;
        const dayOffset = isToday ? 0 : 1 + Math.floor(Math.random() * (maxPastDays - 1));
        const hourOffset = 8 + Math.floor(Math.random() * 15); // 08:00 to 23:00
        const minOffset = Math.floor(Math.random() * 60);
        const orderDate = new Date(now - dayOffset * oneDayMs);
        orderDate.setHours(hourOffset, minOffset, Math.floor(Math.random() * 60));

        const dateKey = toInputDateString(orderDate);
        const isCompleted = Math.random() > 0.03; // 97% completed, 3% voided
        const isCash = Math.random() > 0.45; // 55% cash, 45% QRIS

        // Pick 1 to 3 random items
        const numItems = 1 + Math.floor(Math.random() * 3);
        let subtotal = 0;
        let hppTotal = 0;
        let totalItemsSold = 0;
        const items = [];

        for (let k = 0; k < numItems; k++) {
          const prod = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
          const qty = 1 + Math.floor(Math.random() * 2);
          const itemSubtotal = prod.price * qty;
          const itemHppSubtotal = prod.hpp * qty;

          subtotal += itemSubtotal;
          hppTotal += itemHppSubtotal;
          totalItemsSold += qty;

          items.push({
            productId: prod.id,
            productName: prod.name,
            price: prod.price,
            hpp: prod.hpp,
            qty,
            orderType: (Math.random() > 0.25 ? 'dine_in' : 'takeaway') as 'dine_in' | 'takeaway',
            subtotal: itemSubtotal,
            hppSubtotal: itemHppSubtotal,
            toppings: [],
            notes: '',
          });

          // Aggregate to dailyRollupMap
          if (isCompleted) {
            if (!dailyRollupMap.has(dateKey)) {
              dailyRollupMap.set(dateKey, {
                totalOmset: 0,
                totalProfit: 0,
                totalCash: 0,
                totalQris: 0,
                completedCount: 0,
                voidedCount: 0,
                totalItemsSold: 0,
                productSales: {},
              });
            }
            const d = dailyRollupMap.get(dateKey)!;
            const pKey = String(prod.id);
            if (!d.productSales[pKey]) {
              d.productSales[pKey] = {
                productId: prod.id,
                productName: prod.name,
                quantitySold: 0,
                totalRevenue: 0,
              };
            }
            d.productSales[pKey].quantitySold += qty;
            d.productSales[pKey].totalRevenue += itemSubtotal;
          }
        }

        const total = subtotal;
        const profit = subtotal - hppTotal;

        if (isCompleted) {
          const d = dailyRollupMap.get(dateKey)!;
          d.totalOmset += total;
          d.totalProfit += profit;
          if (isCash) d.totalCash += total;
          else d.totalQris += total;
          d.completedCount += 1;
          d.totalItemsSold += totalItemsSold;
        } else if (dailyRollupMap.has(dateKey)) {
          dailyRollupMap.get(dateKey)!.voidedCount += 1;
        }

        const dummyOrder: IOrder = {
          orderNumber: `TRW-DUMMY-${String(globalIdx).padStart(7, '0')}`,
          sequenceNumber: globalIdx,
          customerName: customerNames[globalIdx % customerNames.length],
          items,
          subtotal,
          discountPercent: 0,
          discountAmount: 0,
          total,
          hppTotal,
          profit,
          paymentMethod: isCash ? 'cash' : 'qris',
          paymentAmount: isCash ? Math.ceil(total / 10000) * 10000 : total,
          changeAmount: isCash ? Math.ceil(total / 10000) * 10000 - total : 0,
          status: isCompleted ? 'completed' : 'voided',
          createdAt: orderDate,
        };

        ordersChunk.push(dummyOrder);
      }

      // Bulk insert to IndexedDB
      await this.database.orders.bulkAdd(ordersChunk);
      created += currentBatchSize;

      const elapsed = Math.max(0.1, (performance.now() - startTime) / 1000);
      const speed = Math.round(created / elapsed);

      if (onProgress) {
        onProgress({
          current: created,
          total: targetCount,
          percent: Math.min(100, Math.round((created / targetCount) * 100)),
          speedTrxPerSec: speed,
          elapsedSeconds: Math.round(elapsed * 10) / 10,
        });
      }

      // Yield thread to let the UI refresh cleanly
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Persist aggregated daily summaries
    const summariesToSave: IDailySummary[] = [];
    for (const [dateKey, data] of dailyRollupMap.entries()) {
      let topName = '-';
      let topQty = 0;
      for (const p of Object.values(data.productSales)) {
        if (p.quantitySold > topQty) {
          topName = p.productName;
          topQty = p.quantitySold;
        }
      }
      const topPct = data.totalItemsSold > 0 ? Math.round((topQty / data.totalItemsSold) * 100) : 0;

      summariesToSave.push({
        date: dateKey,
        totalOmset: data.totalOmset,
        totalProfit: data.totalProfit,
        totalCash: data.totalCash,
        totalQris: data.totalQris,
        completedCount: data.completedCount,
        voidedCount: data.voidedCount,
        totalItemsSold: data.totalItemsSold,
        topProductName: topName,
        topProductPercentage: topPct,
        productSales: data.productSales,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Fetch existing summaries to attach primary key (id) so bulkPut updates existing dates smoothly
    const existingSummaries = await this.database.dailySummaries.toArray();
    const existingIdMap = new Map<string, number>();
    existingSummaries.forEach((s) => {
      if (s.id) existingIdMap.set(s.date, s.id);
    });

    summariesToSave.forEach((summary) => {
      const existingId = existingIdMap.get(summary.date);
      if (existingId) {
        summary.id = existingId;
      }
    });

    await this.database.dailySummaries.bulkPut(summariesToSave);

    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch {
        // Ignore
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    return { durationMs, totalCreated: created };
  }

  /**
   * Deletes all dummy orders and clears dummy dailySummaries.
   */
  async cleanDummyOrders(): Promise<number> {
    const dummyIds: number[] = [];
    await this.database.orders
      .where('orderNumber')
      .startsWith('TRW-DUMMY-')
      .each((o) => {
        if (o.id) dummyIds.push(o.id);
      });

    if (dummyIds.length > 0) {
      await this.database.orders.bulkDelete(dummyIds);
    }

    // Clear dailySummaries and re-sync real orders
    await this.database.dailySummaries.clear();
    const remainingOrders = await this.database.orders.limit(10).toArray();
    if (remainingOrders.length > 0) {
      const dates = new Set<string>();
      await this.database.orders.each((o) => {
        dates.add(toInputDateString(new Date(o.createdAt)));
      });
      for (const d of dates) {
        await reportService.syncDailySummary(new Date(d));
      }
    }

    return dummyIds.length;
  }

  /**
   * Runs real-time performance benchmarks on current dataset.
   */
  async runBenchmarks(): Promise<IBenchmarkResult> {
    const totalOrders = await this.database.orders.count();

    // 1. Storage Estimate (MB)
    let storageEstimateMb = 0;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      storageEstimateMb = Math.round(((est.usage || 0) / (1024 * 1024)) * 10) / 10;
    }

    // 2. Pagination Latency (page 10, limit 10)
    const t0 = performance.now();
    await orderService.getPaginatedOrders(undefined, undefined, 10, 10);
    const paginationLatencyMs = Math.round((performance.now() - t0) * 10) / 10;

    // 3. 1-Year Hybrid Report Latency
    const t1 = performance.now();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    await reportService.getSalesSummary(oneYearAgo, new Date());
    const reportLatencyMs = Math.round((performance.now() - t1) * 10) / 10;

    return {
      totalOrders,
      storageEstimateMb,
      paginationLatencyMs,
      reportLatencyMs,
    };
  }
}

export const stressTestService = new StressTestService();

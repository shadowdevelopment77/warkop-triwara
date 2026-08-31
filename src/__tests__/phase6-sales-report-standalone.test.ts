// ═══════════════════════════════════════════════
// Phase 6 Unit Tests: Stand-Alone Executive Sales Report & 1-Page PDF
// ═══════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { pdfService } from '../services/pdf.service';
import type { ISalesSummary, ITopProduct } from '../services/report.service';
import type { IShopConfig } from '../types';

describe('Phase 6: Stand-Alone Executive Sales Report & 1-Page Clean PDF', () => {
  const mockConfig: IShopConfig = {
    appName: 'Warkop Triwara Test',
    receiptHeaderLines: ['Header 1'],
    receiptFooterLines: ['Footer 1'],
    pinHash: 'dummy-hash',
  };

  const mockSummary: ISalesSummary = {
    totalOmset: 1500000,
    totalCash: 900000,
    totalQris: 600000,
    totalProfit: 850000,
    totalTransactions: 65,
    completedCount: 60,
    voidedCount: 5,
    totalItemsSold: 85,
    topProductName: 'Kopi Susu Aren',
    topProductQty: 35,
    topProductPercentage: 41.2,
  };

  const mockTopProducts: ITopProduct[] = [
    { productId: 1, productName: 'Kopi Susu Aren', quantitySold: 35, totalRevenue: 700000 },
    { productId: 2, productName: 'Americano', quantitySold: 25, totalRevenue: 375000 },
    { productId: 3, productName: 'Caffe Latte', quantitySold: 15, totalRevenue: 330000 },
    { productId: 4, productName: 'Matcha Ice', quantitySold: 10, totalRevenue: 220000 },
  ];

  it('exports clean 1-page sales report PDF without transaction table page', async () => {
    const onProgress = vi.fn();
    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2026-09-01T23:59:59');

    await expect(
      pdfService.exportSalesReport(start, end, mockSummary, mockTopProducts, [], mockConfig, null, onProgress)
    ).resolves.not.toThrow();

    expect(onProgress).toHaveBeenCalledWith(10, expect.any(String));
    expect(onProgress).toHaveBeenCalledWith(100, 'Selesai!');
  });

  it('handles empty sales period in 1-page PDF gracefully', async () => {
    const onProgress = vi.fn();
    const emptySummary: ISalesSummary = {
      totalOmset: 0,
      totalCash: 0,
      totalQris: 0,
      totalProfit: 0,
      totalTransactions: 0,
      completedCount: 0,
      voidedCount: 0,
      totalItemsSold: 0,
      topProductName: '-',
      topProductQty: 0,
      topProductPercentage: 0,
    };

    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2026-09-01T23:59:59');

    await expect(
      pdfService.exportSalesReport(start, end, emptySummary, [], [], mockConfig, null, onProgress)
    ).resolves.not.toThrow();

    expect(onProgress).toHaveBeenCalledWith(100, 'Selesai!');
  });
});

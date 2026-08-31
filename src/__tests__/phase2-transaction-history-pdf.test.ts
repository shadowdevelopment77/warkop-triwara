// ═══════════════════════════════════════════════
// Phase 2 Unit Tests: Stand-Alone Transaction History PDF
// ═══════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { pdfService } from '../services/pdf.service';
import type { IOrder, IShopConfig } from '../types';

describe('Phase 2: Stand-Alone Transaction History PDF Export', () => {
  const mockConfig: IShopConfig = {
    appName: 'Warkop Triwara Test',
    receiptHeaderLines: ['Header 1', 'Header 2'],
    receiptFooterLines: ['Footer 1'],
    pinHash: 'dummy-hash',
  };

  const sampleOrders: IOrder[] = [
    {
      id: 1,
      orderNumber: 'TRW-20260901-001',
      sequenceNumber: 1,
      customerName: 'Ahmad',
      processedBy: 'Budi',
      items: [],
      subtotal: 36000,
      discountPercent: 0,
      discountAmount: 0,
      total: 36000,
      hppTotal: 15000,
      profit: 21000,
      paymentMethod: 'cash',
      paymentAmount: 50000,
      changeAmount: 14000,
      status: 'completed',
      createdAt: new Date('2026-09-01T08:30:00'),
    },
    {
      id: 2,
      orderNumber: 'TRW-20260901-002',
      sequenceNumber: 2,
      customerName: 'Siti',
      processedBy: 'Budi',
      items: [],
      subtotal: 25000,
      discountPercent: 0,
      discountAmount: 0,
      total: 25000,
      hppTotal: 10000,
      profit: 15000,
      paymentMethod: 'qris',
      paymentAmount: 25000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date('2026-09-01T09:15:00'),
    },
    {
      id: 3,
      orderNumber: 'TRW-20260901-003',
      sequenceNumber: 3,
      customerName: 'Umum',
      processedBy: 'Budi',
      items: [],
      subtotal: 18000,
      discountPercent: 0,
      discountAmount: 0,
      total: 18000,
      hppTotal: 8000,
      profit: 10000,
      paymentMethod: 'cash',
      paymentAmount: 20000,
      changeAmount: 2000,
      status: 'voided',
      createdAt: new Date('2026-09-01T10:00:00'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports transaction history report PDF without throwing error', async () => {
    const progressMessages: string[] = [];
    const onProgress = vi.fn((_percent: number, message: string) => {
      progressMessages.push(message);
    });

    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2026-09-01T23:59:59');

    await expect(
      pdfService.exportTransactionHistoryReport(start, end, sampleOrders, mockConfig, onProgress)
    ).resolves.not.toThrow();

    expect(onProgress).toHaveBeenCalledWith(10, expect.any(String));
    expect(onProgress).toHaveBeenCalledWith(100, 'Selesai!');
  });

  it('handles empty orders list gracefully', async () => {
    const onProgress = vi.fn();
    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2026-09-01T23:59:59');

    await expect(
      pdfService.exportTransactionHistoryReport(start, end, [], mockConfig, onProgress)
    ).resolves.not.toThrow();

    expect(onProgress).toHaveBeenCalledWith(100, 'Selesai!');
  });

  it('caps large dataset over 500 orders without memory crash', async () => {
    const largeOrders: IOrder[] = Array.from({ length: 600 }, (_, i) => ({
      id: i + 1,
      orderNumber: `TRW-20260901-${String(i + 1).padStart(3, '0')}`,
      sequenceNumber: i + 1,
      customerName: `Customer ${i + 1}`,
      processedBy: 'Kasir',
      items: [],
      subtotal: 20000,
      discountPercent: 0,
      discountAmount: 0,
      total: 20000,
      hppTotal: 8000,
      profit: 12000,
      paymentMethod: 'cash',
      paymentAmount: 20000,
      changeAmount: 0,
      status: 'completed',
      createdAt: new Date(),
    }));

    const onProgress = vi.fn();
    const start = new Date('2026-09-01T00:00:00');
    const end = new Date('2026-09-01T23:59:59');

    await expect(
      pdfService.exportTransactionHistoryReport(start, end, largeOrders, mockConfig, onProgress)
    ).resolves.not.toThrow();

    expect(onProgress).toHaveBeenCalledWith(100, 'Selesai!');
  });
});

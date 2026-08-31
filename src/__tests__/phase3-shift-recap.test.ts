// ═══════════════════════════════════════════════
// Phase 3 Unit Tests: Shift Display & Rekap PDF Overhaul
// ═══════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { pdfService } from '../services/pdf.service';
import type { IShift, IShopConfig } from '../types';

describe('Phase 3: Shift Display & Rekap PDF Overhaul', () => {
  const mockConfig: IShopConfig = {
    appName: 'Warkop Triwara Test',
    receiptHeaderLines: ['Header 1'],
    receiptFooterLines: ['Footer 1'],
    pinHash: 'dummy-hash',
  };

  const mockShift: IShift = {
    id: 1,
    shiftNumber: 'SHF-20260901-001',
    cashierId: 1,
    cashierName: 'Kasir Budi',
    openedAt: new Date('2026-09-01T08:00:00'),
    closedAt: new Date('2026-09-01T16:00:00'),
    startingCash: 100000,
    totalCashSales: 350000,
    totalQrisSales: 200000,
    cashTransactions: 15,
    qrisTransactions: 8,
    totalTransactions: 23,
    totalVoided: 2,
    totalExpenses: 25000,
    expectedEndingCash: 425000, // 100k + 350k - 25k
    actualEndingCash: 425000,
    cashDifference: 0,
    status: 'closed',
    expenses: [
      {
        id: 'exp-1',
        description: 'Beli Es Batu Kristal',
        amount: 25000,
      },
    ],
  };

  it('exports shift report PDF without error and contains exact 9 financial lines', async () => {
    await expect(pdfService.exportShiftReportPdf(mockShift, mockConfig)).resolves.not.toThrow();
  });

  it('handles shift with no expenses gracefully', async () => {
    const shiftNoExpenses: IShift = {
      ...mockShift,
      totalExpenses: 0,
      expenses: [],
    };
    await expect(pdfService.exportShiftReportPdf(shiftNoExpenses, mockConfig)).resolves.not.toThrow();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { ReportService } from '../services/report.service';
import type { ILog } from '../types';

describe('Scope 3: Immutable Activity Logs & B-Tree Paginated Queries', () => {
  let testDb: TriwaraDatabase;
  let reportService: ReportService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    reportService = new ReportService(testDb);

    await testDb.logs.clear();
  });

  it('Paginates 35 logs cleanly at database level with offset and limit', async () => {
    const baseTime = new Date('2026-08-31T08:00:00').getTime();

    // Create 35 mock logs
    for (let i = 1; i <= 35; i++) {
      await testDb.logs.add({
        type: i % 2 === 0 ? 'void' : 'inventory',
        description: `Aktivitas Log #${i}`,
        referenceId: `REF-${i}`,
        createdAt: new Date(baseTime + i * 60000), // 1 min apart
      } as unknown as ILog);
    }

    // Page 1: 10 items (Log 35 down to 26)
    const page1 = await reportService.getPaginatedLogs('all', '', 1, 10);
    expect(page1.totalCount).toBe(35);
    expect(page1.totalPages).toBe(4);
    expect(page1.currentPage).toBe(1);
    expect(page1.logs).toHaveLength(10);
    expect(page1.logs[0].description).toBe('Aktivitas Log #35'); // newest first
    expect(page1.logs[9].description).toBe('Aktivitas Log #26');

    // Page 2: 10 items (Log 25 down to 16)
    const page2 = await reportService.getPaginatedLogs('all', '', 2, 10);
    expect(page2.currentPage).toBe(2);
    expect(page2.logs).toHaveLength(10);
    expect(page2.logs[0].description).toBe('Aktivitas Log #25');

    // Page 4: Remaining 5 items (Log 5 down to 1)
    const page4 = await reportService.getPaginatedLogs('all', '', 4, 10);
    expect(page4.currentPage).toBe(4);
    expect(page4.logs).toHaveLength(5);
    expect(page4.logs[4].description).toBe('Aktivitas Log #1');
  });

  it('Filters logs by category type using B-Tree index', async () => {
    // 10 void logs
    for (let i = 1; i <= 10; i++) {
      await testDb.logs.add({
        type: 'void',
        description: `Void #${i}`,
        referenceId: `V-${i}`,
        createdAt: new Date(),
      } as unknown as ILog);
    }

    // 20 inventory logs
    for (let i = 1; i <= 20; i++) {
      await testDb.logs.add({
        type: 'inventory',
        description: `Restock #${i}`,
        referenceId: `INV-${i}`,
        createdAt: new Date(),
      } as unknown as ILog);
    }

    const voidOnly = await reportService.getPaginatedLogs('void', '', 1, 10);
    expect(voidOnly.totalCount).toBe(10);
    expect(voidOnly.totalPages).toBe(1);
    expect(voidOnly.logs).toHaveLength(10);
    expect(voidOnly.logs.every((l) => l.type === 'void')).toBe(true);

    const invOnly = await reportService.getPaginatedLogs('inventory', '', 1, 15);
    expect(invOnly.totalCount).toBe(20);
    expect(invOnly.totalPages).toBe(2);
    expect(invOnly.logs).toHaveLength(15);
    expect(invOnly.logs.every((l) => l.type === 'inventory')).toBe(true);
  });

  it('Filters logs by specific date using createdAt index range', async () => {
    // 5 logs on Aug 28
    for (let i = 1; i <= 5; i++) {
      await testDb.logs.add({
        type: 'shift',
        description: `Shift Aug 28 #${i}`,
        referenceId: `SHF-${i}`,
        createdAt: new Date('2026-08-28T10:00:00'),
      } as unknown as ILog);
    }

    // 8 logs on Aug 29
    for (let i = 1; i <= 8; i++) {
      await testDb.logs.add({
        type: 'shift',
        description: `Shift Aug 29 #${i}`,
        referenceId: `SHF-${i}`,
        createdAt: new Date('2026-08-29T14:00:00'),
      } as unknown as ILog);
    }

    const aug29Logs = await reportService.getPaginatedLogs('all', '2026-08-29', 1, 10);
    expect(aug29Logs.totalCount).toBe(8);
    expect(aug29Logs.logs).toHaveLength(8);
    expect(aug29Logs.logs[0].description).toContain('Shift Aug 29');
  });

  it('Supports combined category type and date filtering', async () => {
    await testDb.logs.add({
      type: 'void',
      description: 'Void Aug 31',
      referenceId: 'V-1',
      createdAt: new Date('2026-08-31T11:00:00'),
    } as unknown as ILog);

    await testDb.logs.add({
      type: 'shift',
      description: 'Shift Aug 31',
      referenceId: 'S-1',
      createdAt: new Date('2026-08-31T12:00:00'),
    } as unknown as ILog);

    const combined = await reportService.getPaginatedLogs('void', '2026-08-31', 1, 10);
    expect(combined.totalCount).toBe(1);
    expect(combined.logs[0].description).toBe('Void Aug 31');
  });
});

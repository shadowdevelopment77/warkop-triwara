import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { BackupService } from '../services/backup.service';
import type { IProduct, IIngredient, IOrder, IShift } from '../types';

describe('Backup & Restore Database Full Tests', () => {
  let testDb: TriwaraDatabase;
  let backupService: BackupService;

  beforeEach(async () => {
    const dbName = `TriwaraBackupTest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    testDb = new TriwaraDatabase(dbName);
    await testDb.open();
    backupService = new BackupService(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('exports all 11 tables with correct metadata and JSON structure', async () => {
    // 1. Seed some sample data
    await testDb.categories.add({ id: 1, name: 'Kopi', sortOrder: 1 });

    const prod: IProduct = {
      id: 10,
      name: 'Kopi Tubruk',
      categoryId: 1,
      price: 10000,
      description: 'Kopi hitam',
      recipe: [],
      takeawayPackaging: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await testDb.products.add(prod);

    const ing: IIngredient = {
      id: 20,
      name: 'Biji Robusta',
      category: 'Kopi',
      currentStock: 1000,
      unit: 'gr',
      minStock: 200,
      costPerUnit: 150,
      purchasePrice: 150000,
      purchaseQuantity: 1000,
      purchasePackageName: 'Pack 1kg',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await testDb.ingredients.add(ing);

    const order: IOrder = {
      id: 30,
      orderNumber: 'TRW-TEST-001',
      sequenceNumber: 1,
      customerName: 'Pelanggan Uji',
      items: [
        {
          productId: 10,
          productName: 'Kopi Tubruk',
          price: 10000,
          hpp: 4000,
          hppSubtotal: 4000,
          qty: 1,
          orderType: 'dine_in',
          toppings: [],
          notes: '',
          subtotal: 10000,
        },
      ],
      subtotal: 10000,
      discountPercent: 0,
      discountAmount: 0,
      total: 10000,
      paymentMethod: 'cash',
      paymentAmount: 10000,
      changeAmount: 0,
      status: 'completed',
      hppTotal: 4000,
      profit: 6000,
      createdAt: new Date('2026-08-30T10:00:00.000Z'),
    };
    await testDb.orders.add(order);

    const shift: IShift = {
      id: 40,
      shiftNumber: 'SHF-TEST-001',
      cashierId: 1,
      cashierName: 'Barista Uji',
      openedAt: new Date('2026-08-30T08:00:00.000Z'),
      startingCash: 50000,
      totalCashSales: 10000,
      totalQrisSales: 0,
      totalTransactions: 1,
      cashTransactions: 1,
      qrisTransactions: 0,
      totalVoided: 0,
      totalExpenses: 0,
      expectedEndingCash: 60000,
      status: 'open',
    };
    await testDb.shifts.add(shift);
    await testDb.heldOrders.add({
      customerName: 'Pesanan Sementara',
      cartItems: [],
      discountPercent: 0,
      createdAt: new Date(),
    });

    // 2. Perform export
    const payload = await backupService.exportDatabase();

    expect(payload.version).toBe(4);
    expect(payload.appName).toBe('Triwara POS');
    expect(payload.stats.categories).toBe(1);
    expect(payload.stats.products).toBe(1);
    expect(payload.stats.ingredients).toBe(1);
    expect(payload.stats.orders).toBe(1);
    expect(payload.stats.shifts).toBe(1);
    expect(payload.data.products[0].name).toBe('Kopi Tubruk');
    expect(payload.data.ingredients[0].name).toBe('Biji Robusta');
  });

  it('restores all data atomically from JSON string and revives native Date objects', async () => {
    // 1. Prepare a JSON payload with ISO string dates
    const jsonPayload = JSON.stringify({
      version: 3,
      appName: 'Triwara POS',
      exportedAt: '2026-09-01T02:00:00.000Z',
      stats: {
        categories: 1,
        products: 1,
        ingredients: 1,
        orders: 1,
        inventoryLogs: 0,
        logs: 0,
        shopConfig: 1,
        notifications: 0,
        staff: 1,
        shifts: 1,
        dailySummaries: 0,
      },
      data: {
        categories: [{ id: 1, name: 'Makanan', sortOrder: 2 }],
        products: [
          {
            id: 55,
            name: 'Roti Bakar',
            categoryId: 1,
            price: 15000,
            description: 'Roti bakar enak',
            recipe: [],
            takeawayPackaging: [],
            isActive: true,
            createdAt: '2026-08-25T10:00:00.000Z',
            updatedAt: '2026-08-25T10:00:00.000Z',
          },
        ],
        ingredients: [
          {
            id: 77,
            name: 'Roti Tawar',
            category: 'Bakery',
            currentStock: 50,
            unit: 'pcs',
            minStock: 10,
            costPerUnit: 1000,
            purchasePrice: 10000,
            purchaseQuantity: 10,
            purchasePackageName: 'Pack',
            createdAt: '2026-08-25T10:00:00.000Z',
            updatedAt: '2026-08-25T10:00:00.000Z',
          },
        ],
        orders: [
          {
            id: 99,
            orderNumber: 'TRW-RESTORE-001',
            sequenceNumber: 1,
            customerName: 'Ahmad',
            items: [],
            subtotal: 15000,
            discountPercent: 0,
            discountAmount: 0,
            total: 15000,
            paymentMethod: 'qris',
            paymentAmount: 15000,
            changeAmount: 0,
            status: 'completed',
            hppTotal: 6000,
            profit: 9000,
            createdAt: '2026-08-25T14:30:00.000Z',
          },
        ],
        inventoryLogs: [],
        logs: [],
        shopConfig: [
          {
            id: 1,
            shopName: 'Warkop Triwara',
            phone: '08123456789',
            address: 'Surabaya',
            receiptHeader: 'Selamat Datang',
            receiptFooter: 'Terima Kasih',
            customUnits: ['botol', 'sachet'],
          },
        ],
        notifications: [],
        staff: [{ id: 1, name: 'Owner Toko', pin: '1234', role: 'owner', active: true }],
        shifts: [
          {
            id: 88,
            shiftNumber: 'SHF-RESTORE-001',
            cashierId: 1,
            cashierName: 'Owner Toko',
            openedAt: '2026-08-25T08:00:00.000Z',
            closedAt: '2026-08-25T16:00:00.000Z',
            startingCash: 100000,
            totalCashSales: 0,
            totalQrisSales: 15000,
            totalTransactions: 1,
            cashTransactions: 0,
            qrisTransactions: 1,
            totalVoided: 0,
            totalExpenses: 0,
            expectedEndingCash: 100000,
            actualEndingCash: 100000,
            cashDifference: 0,
            status: 'closed',
          },
        ],
        dailySummaries: [],
      },
    });

    // Restore must discard any temporary held order already present on target device.
    await testDb.heldOrders.add({
      customerName: 'Cart Lama Target',
      cartItems: [],
      discountPercent: 0,
      createdAt: new Date(),
    });

    // 2. Perform import
    const result = await backupService.importDatabase(jsonPayload);
    expect(result.success).toBe(true);
    expect(result.stats.products).toBe(1);
    expect(result.stats.orders).toBe(1);

    // 3. Verify Database Contents
    const restoredProducts = await testDb.products.toArray();
    expect(restoredProducts.length).toBe(1);
    expect(restoredProducts[0].name).toBe('Roti Bakar');

    const restoredOrders = await testDb.orders.toArray();
    expect(restoredOrders.length).toBe(1);
    expect(restoredOrders[0].orderNumber).toBe('TRW-RESTORE-001');
    // Verify revived Date object
    expect(restoredOrders[0].createdAt).toBeInstanceOf(Date);
    expect(restoredOrders[0].createdAt.toISOString()).toBe('2026-08-25T14:30:00.000Z');

    const restoredShifts = await testDb.shifts.toArray();
    expect(restoredShifts.length).toBe(1);
    expect(restoredShifts[0].openedAt).toBeInstanceOf(Date);
    expect(restoredShifts[0].closedAt).toBeInstanceOf(Date);

    const restoredConfig = await testDb.shopConfig.toArray();
    expect(restoredConfig[0].customUnits).toContain('sachet');

    // Held orders are temporary and intentionally excluded from a restore.
    expect(await testDb.heldOrders.count()).toBe(0);

    // Missing summaries in legacy backups are rebuilt from raw orders.
    const restoredSummary = await testDb.dailySummaries.where('date').equals('2026-08-25').first();
    expect(restoredSummary?.totalOmset).toBe(15000);
    expect(restoredSummary?.totalQris).toBe(15000);
  });

  it('rejects invalid or corrupted backup files with clear error messages', async () => {
    // Non-JSON
    await expect(backupService.importDatabase('INVALID_NOT_JSON')).rejects.toThrow(
      'Format file tidak valid'
    );

    // Wrong App
    const wrongAppJson = JSON.stringify({
      version: 1,
      appName: 'OtherPOS',
      data: {},
    });
    await expect(backupService.importDatabase(wrongAppJson)).rejects.toThrow(
      'File ini bukan file backup resmi Triwara POS.'
    );
  });
});

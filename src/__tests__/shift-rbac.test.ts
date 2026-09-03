// ═══════════════════════════════════════════════
// Triwara POS — Shift Management & RBAC Unit Tests
// ═══════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { TriwaraDatabase } from '../database/db';
import { StaffService } from '../services/staff.service';
import { ShiftService } from '../services/shift.service';
import { OrderService } from '../services/order.service';
import { HppService } from '../services/hpp.service';

describe('Shift & Multi-PIN RBAC Lifecycle Tests', () => {
  let testDb: TriwaraDatabase;
  let staffService: StaffService;
  let shiftService: ShiftService;
  let orderService: OrderService;
  let hppService: HppService;

  beforeEach(async () => {
    testDb = new TriwaraDatabase();
    staffService = new StaffService(testDb);
    shiftService = new ShiftService(testDb);
    hppService = new HppService(testDb);
    orderService = new OrderService(testDb, hppService);

    await testDb.staff.clear();
    await testDb.shifts.clear();
    await testDb.orders.clear();
    await testDb.logs.clear();
    await testDb.products.clear();
    await testDb.ingredients.clear();
    await testDb.heldOrders.clear();

    // Seed Owner & Cashier
    await testDb.staff.bulkAdd([
      {
        name: 'Owner Toko',
        pin: '0000',
        role: 'owner',
        active: true,
        createdAt: new Date(),
      },
      {
        name: 'Siti Kasir',
        pin: '1234',
        role: 'cashier',
        active: true,
        createdAt: new Date(),
      },
    ]);
  });

  it('authenticates valid PIN and rejects incorrect PIN', async () => {
    const owner = await staffService.authenticate('0000');
    expect(owner).not.toBeNull();
    expect(owner?.name).toBe('Owner Toko');
    expect(owner?.role).toBe('owner');

    const cashier = await staffService.authenticate('1234');
    expect(cashier).not.toBeNull();
    expect(cashier?.name).toBe('Siti Kasir');
    expect(cashier?.role).toBe('cashier');

    const invalid = await staffService.authenticate('9999');
    expect(invalid).toBeNull();
  });

  it('enforces unique PIN validation when creating staff', async () => {
    // Attempt duplicate PIN
    await expect(staffService.createStaff('Budi', '1234', 'cashier')).rejects.toThrow(
      'PIN "1234" sudah digunakan'
    );

    // Create staff with unique PIN
    const newStaff = await staffService.createStaff('Budi Baru', '5678', 'cashier');
    expect(newStaff.id).toBeDefined();
    expect(newStaff.pin).toBe('5678');
  });

  it('runs complete shift lifecycle: open -> transaction -> void -> close with reconciliation', async () => {
    const cashier = (await staffService.authenticate('1234'))!;

    // 1. Open Shift with Rp 100.000 starting cash
    const shift = await shiftService.openShift(cashier, 100000, 'Uang kembalian pecahan 5rb');
    expect(shift.status).toBe('open');
    expect(shift.startingCash).toBe(100000);
    expect(shift.expectedEndingCash).toBe(100000);

    // Cannot open another shift while one is active
    await expect(shiftService.openShift(cashier, 50000)).rejects.toThrow(
      'masih berjalan'
    );

    // 2. Add a sample product
    const prodId = (await testDb.products.add({
      categoryId: 1,
      name: 'Kopi Susu Gula Aren',
      price: 18000,
      description: 'Enak',
      recipe: [],
      takeawayPackaging: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number;

    const sampleProduct = (await testDb.products.get(prodId))!;

    // 3. Process Cash Order of Rp 36.000 (2 cups)
    const { order: cashOrder } = await orderService.createOrder(
      [
        {
          cartId: 'c1',
          product: sampleProduct,
          quantity: 2,
          orderType: 'dine_in',
          temperature: 'Iced',
          sugarLevel: 'Normal (100%)',
          extraToppings: [],
          notes: '',
          itemPrice: 18000,
          itemHpp: 5000,
        },
      ],
      'Pelanggan Meja 1',
      0,
      'cash',
      50000,
      cashier.name
    );

    expect(cashOrder.shiftId).toBe(shift.id);

    // Check active shift updated
    let active = (await shiftService.getActiveShift())!;
    expect(active.totalCashSales).toBe(36000);
    expect(active.totalTransactions).toBe(1);
    expect(active.expectedEndingCash).toBe(136000); // 100.000 + 36.000

    // 4. Process QRIS Order of Rp 18.000 (1 cup)
    await orderService.createOrder(
      [
        {
          cartId: 'c2',
          product: sampleProduct,
          quantity: 1,
          orderType: 'dine_in',
          temperature: 'Iced',
          sugarLevel: 'Normal (100%)',
          extraToppings: [],
          notes: '',
          itemPrice: 18000,
          itemHpp: 5000,
        },
      ],
      'Pelanggan QRIS',
      0,
      'qris',
      18000,
      cashier.name
    );

    active = (await shiftService.getActiveShift())!;
    expect(active.totalCashSales).toBe(36000);
    expect(active.totalQrisSales).toBe(18000);
    expect(active.totalTransactions).toBe(2);
    expect(active.cashTransactions).toBe(1);
    expect(active.qrisTransactions).toBe(1);

    // 5. Test Product Sales aggregation during shift
    const productSales = await shiftService.getShiftProductSales(shift.id!);
    expect(productSales).toHaveLength(1);
    expect(productSales[0].productName).toBe('Kopi Susu Gula Aren');
    expect(productSales[0].quantitySold).toBe(3); // 2 from cash + 1 from QRIS

    // 6. Test Void: Void cash order
    await orderService.voidOrder(cashOrder.id!, 'Pelanggan membatalkan pesanan');
    active = (await shiftService.getActiveShift())!;
    expect(active.totalCashSales).toBe(0); // Deducted back!
    expect(active.cashTransactions).toBe(0);
    expect(active.totalVoided).toBe(1);
    expect(active.expectedEndingCash).toBe(100000); // Back to starting cash

    // 7. Close Shift with Physical Cash Count of Rp 102.000 (+2.000 difference / tip)
    const closed = await shiftService.closeShift(shift.id!, 102000, 'Ada lebih 2rb uang tip');
    expect(closed.status).toBe('closed');
    expect(closed.actualEndingCash).toBe(102000);
    expect(closed.expectedEndingCash).toBe(100000);
    expect(closed.cashDifference).toBe(2000);

    // Active shift is now null
    const noActive = await shiftService.getActiveShift();
    expect(noActive).toBeNull();
  });

  it('refuses to close a shift while a held order remains', async () => {
    const cashier = (await staffService.authenticate('1234'))!;
    const shift = await shiftService.openShift(cashier, 50000);

    await testDb.heldOrders.add({
      customerName: 'Pelanggan Tunggu',
      cartItems: [],
      discountPercent: 0,
      createdAt: new Date(),
    });

    await expect(shiftService.closeShift(shift.id!, 50000)).rejects.toThrow('pesanan tersimpan');
    expect((await testDb.shifts.get(shift.id!))?.status).toBe('open');
  });
});

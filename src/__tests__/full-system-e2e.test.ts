import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database/db';
import { resetAndSeedDatabase } from '../database/seed';
import { orderService } from '../services/order.service';
import { shiftService } from '../services/shift.service';
import { reportService } from '../services/report.service';
import { backupService } from '../services/backup.service';
import { receiptService } from '../services/receipt.service';
import { licenseService, ACTIVATION_KEYS } from '../services/license.service';
import { hashPin } from '../utils/hash';
import type { IShopConfig, ICartItem } from '../types';

describe('Full System End-to-End (E2E) Integration Flow', () => {
  beforeEach(async () => {
    // Reset database to clean zero-state (0 orders, 0 shifts)
    await resetAndSeedDatabase(db, 0);
    licenseService.resetToDefault();
  });

  it('executes complete 10-step shop lifecycle from opening to closing and licensing without flaws', async () => {
    // ══════════════════════════════════════════════════════════════════════
    // STEP 1: Database Zero-State Verification
    // ══════════════════════════════════════════════════════════════════════
    const initialOrderCount = await db.orders.count();
    const initialShiftCount = await db.shifts.count();
    const productCount = await db.products.count();
    const ingredientCount = await db.ingredients.count();

    expect(initialOrderCount).toBe(0);
    expect(initialShiftCount).toBe(0);
    expect(productCount).toBeGreaterThan(0);
    expect(ingredientCount).toBeGreaterThan(0);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2: Authentication & PIN RBAC Verification
    // ══════════════════════════════════════════════════════════════════════
    const staffList = await db.staff.toArray();
    const owner = staffList.find((s) => s.role === 'owner');
    const cashier = staffList.find((s) => s.role === 'cashier');

    expect(owner).toBeDefined();
    expect(cashier).toBeDefined();
    expect(owner?.pin).toBe('0000');
    expect(cashier?.pin).toBe('1234');

    const config = await db.shopConfig.toCollection().first();
    expect(config?.appName).toBe('Warkop Triwara');

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3: Cashier Opens Shift
    // ══════════════════════════════════════════════════════════════════════
    const openedShift = await shiftService.openShift(cashier!, 100000);
    expect(openedShift.status).toBe('open');
    expect(openedShift.startingCash).toBe(100000);
    expect(openedShift.shiftNumber).toMatch(/^SHF-\d{8}-\d{3}$/);

    const activeShift = await shiftService.getActiveShift();
    expect(activeShift).not.toBeNull();
    expect(activeShift?.id).toBe(openedShift.id);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 4: POS Order Creation, HPP FIFO, & Atomic Recipe Stock Deduction
    // ══════════════════════════════════════════════════════════════════════
    const kopiSusu = await db.products.where('name').equals('Kopi Susu Aren').first();
    expect(kopiSusu).toBeDefined();

    // Check pre-order ingredient stock (Espresso Beans)
    const espressoIngredient = await db.ingredients.where('name').equals('Biji Kopi Espresso Blend').first();
    expect(espressoIngredient).toBeDefined();
    const initialEspressoStock = espressoIngredient!.currentStock;

    // Order 2 cups of Kopi Susu
    const cartItems: ICartItem[] = [
      {
        cartId: 'cart-item-1',
        product: kopiSusu!,
        quantity: 2,
        orderType: 'dine_in',
        temperature: 'Iced',
        sugarLevel: 'normal',
        extraToppings: [],
        notes: 'Less sugar, normal ice',
        itemPrice: kopiSusu!.price,
        itemHpp: 5000,
      },
    ];

    const orderSubtotal = kopiSusu!.price * 2;
    const paymentAmount = 50000;
    const changeAmount = paymentAmount - orderSubtotal;

    const { order: createdOrder } = await orderService.createOrder(
      cartItems,
      'Pelanggan Uji E2E',
      0,
      'cash',
      paymentAmount,
      cashier!.name
    );

    expect(createdOrder.orderNumber).toMatch(/^TRW-\d{8}-\d{3}$/);
    expect(createdOrder.changeAmount).toBe(changeAmount);

    // Verify inventory deduction occurred
    const updatedEspresso = await db.ingredients.get(espressoIngredient!.id!);
    expect(updatedEspresso!.currentStock).toBeLessThan(initialEspressoStock);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 5: ESC/POS Thermal Receipt Generation & Binary Frames
    // ═══════════════════════════════════════════════
    const dummyShopConfig: IShopConfig = {
      appName: 'Warkop Triwara',
      receiptHeaderLines: ['Warkop Triwara', 'Jl. Sunset Road', '0812-3456-7890'],
      receiptFooterLines: ['Terima Kasih', 'WiFi: Triwara_Guest'],
      pinHash: await hashPin('0000'),
    };

    // Format receipts
    const customerReceiptText = receiptService.generateReceiptText(createdOrder, dummyShopConfig, 'customer');
    const barReceiptText = receiptService.generateReceiptText(createdOrder, dummyShopConfig, 'bar');
    const kitchenReceiptText = receiptService.generateReceiptText(createdOrder, dummyShopConfig, 'kitchen');

    expect(customerReceiptText).toContain('Warkop Triwara');
    expect(customerReceiptText).toContain(createdOrder.orderNumber);
    expect(barReceiptText).toContain('ORDER BAR');
    expect(kitchenReceiptText).toContain('ORDER DAPUR');

    // Convert to ESC/POS binary buffer
    const escposBuffer = receiptService.convertToEscPosBuffer(customerReceiptText);
    expect(escposBuffer).toBeInstanceOf(Uint8Array);
    // Begins with ESC @ (0x1B 0x40)
    expect(escposBuffer[0]).toBe(0x1b);
    expect(escposBuffer[1]).toBe(0x40);
    // Ends with paper cut GS V (0x1D 0x56)
    expect(escposBuffer[escposBuffer.length - 4]).toBe(0x1d);
    expect(escposBuffer[escposBuffer.length - 3]).toBe(0x56);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 6: Order Void & Inventory Restoration
    // ══════════════════════════════════════════════════════════════════════
    const voidReason = 'Pelanggan batal memesan kopi';
    await orderService.voidOrder(createdOrder.id!, voidReason);

    const voidedOrder = await db.orders.get(createdOrder.id!);
    expect(voidedOrder?.status).toBe('voided');
    expect(voidedOrder?.voidReason).toBe(voidReason);

    // Verify stock restored
    const restoredEspresso = await db.ingredients.get(espressoIngredient!.id!);
    expect(restoredEspresso!.currentStock).toBe(initialEspressoStock);

    // Create a final completed order so shift has actual sales
    const { order: finalOrder } = await orderService.createOrder(
      cartItems,
      'Pelanggan Tetap',
      0,
      'cash',
      orderSubtotal,
      cashier!.name
    );
    expect(finalOrder.status).toBe('completed');

    // ══════════════════════════════════════════════════════════════════════
    // STEP 7: Cashier Shift Close & Reconciliation
    // ══════════════════════════════════════════════════════════════════════
    const expectedCashInDrawer = 100000 + orderSubtotal;
    const closedShift = await shiftService.closeShift(
      openedShift.id!,
      expectedCashInDrawer,
      'Shift lancar, kas pas sesuai rekap.'
    );

    expect(closedShift.status).toBe('closed');
    expect(closedShift.cashDifference).toBe(0);
    expect(closedShift.totalCashSales).toBe(orderSubtotal);

    // Format Shift Receipt
    const shiftReceiptText = receiptService.generateShiftReceiptText(closedShift, dummyShopConfig);
    expect(shiftReceiptText).toContain('REKAP SHIFT KASIR');
    expect(shiftReceiptText).toContain(closedShift.shiftNumber);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 8: Sales Reports & Daily Summaries
    // ══════════════════════════════════════════════════════════════════════
    const today = new Date();
    const bundle = await reportService.getReportBundle(today, today);
    expect(bundle.summary.totalOmset).toBe(orderSubtotal);
    expect(bundle.summary.completedCount).toBe(1);
    expect(bundle.summary.voidedCount).toBe(1);
    expect(bundle.summary.totalProfit).toBeGreaterThan(0);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 9: Full Database Backup Payload Generation
    // ══════════════════════════════════════════════════════════════════════
    const backupPayload = await backupService.exportDatabase();
    expect(backupPayload.appName).toBe('Triwara POS');
    expect(backupPayload.stats.orders).toBe(2); // 1 voided + 1 completed
    expect(backupPayload.stats.shifts).toBe(1);
    expect(backupPayload.stats.products).toBeGreaterThan(0);
    expect(backupPayload.data.orders.length).toBe(2);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 10: Official License Lifecycle Verification (Stage 1 -> Stage 2 -> Lifetime)
    // ══════════════════════════════════════════════════════════════════════
    // Initial stage is tempo_1
    const initialLic = licenseService.getLicenseInfo();
    expect(initialLic.stage).toBe('tempo_1');
    expect(initialLic.expiresAt).toBe('2026-10-05T00:00:00.000Z');

    // Reject wrong key
    const invalidRes = licenseService.activateCode('WRONG-RANDOM-KEY');
    expect(invalidRes.success).toBe(false);

    // Activate Stage 1 with official master key
    const stage1Res = licenseService.activateCode(ACTIVATION_KEYS.STAGE_1_EXTEND);
    expect(stage1Res.success).toBe(true);
    expect(stage1Res.stage).toBe('tempo_2');

    const stage1Lic = licenseService.getLicenseInfo();
    expect(stage1Lic.stage).toBe('tempo_2');
    expect(stage1Lic.expiresAt).toBe('2026-11-05T00:00:00.000Z');

    // Activate Stage 2 Lifetime with official master key
    const lifetimeRes = licenseService.activateCode(ACTIVATION_KEYS.STAGE_2_LIFETIME);
    expect(lifetimeRes.success).toBe(true);
    expect(lifetimeRes.stage).toBe('lifetime');

    const lifetimeLic = licenseService.getLicenseInfo();
    expect(lifetimeLic.stage).toBe('lifetime');
    expect(lifetimeLic.expiresAt).toBeNull();
    expect(lifetimeLic.isLocked).toBe(false);
  });
});

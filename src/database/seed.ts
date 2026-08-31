// ═══════════════════════════════════════════════
// Triwara POS — Comprehensive Database Seeder (1000 Orders)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from './db';
import { hashPin } from '../utils/hash';
import type { IOrder, IOrderItem, IRecipeItem, IProductAdditional, PaymentMethod, TransactionStatus } from '../types';

let isSeedingInProgress = false;

export async function resetAndSeedDatabase(database: TriwaraDatabase = db, totalOrders = 0): Promise<void> {
  if (isSeedingInProgress) return;
  isSeedingInProgress = true;

  try {
    // 1. Clear existing transactional & master data
    await database.orders.clear();
    await database.inventoryLogs.clear();
    await database.logs.clear();
    await database.notifications.clear();
    await database.products.clear();
    await database.ingredients.clear();
    await database.categories.clear();
    await database.shopConfig.clear();
    await database.staff.clear();
    await database.shifts.clear();

    const now = new Date();
    const nowMs = now.getTime();

    // 2. Seed Staff (Owner + Cashier)
    await database.staff.bulkAdd([
      {
        name: 'Owner Toko',
        pin: '0000',
        role: 'owner',
        active: true,
        createdAt: now,
      },
      {
        name: 'Budi (Kasir)',
        pin: '1234',
        role: 'cashier',
        active: true,
        createdAt: now,
      },
    ]);

    // 3. Shop Configuration
    const defaultPinHash = await hashPin('0000');
    await database.shopConfig.add({
      appName: 'Warkop Triwara',
      receiptHeaderLines: [
        'Warkop Triwara Coffee',
        'Jl. Sunset Road No. 88, Kuta, Bali',
        'Telp: 0812-3456-7890',
      ],
      receiptFooterLines: [
        'Terima Kasih Atas Kunjungan Anda!',
        'Follow IG: @warkoptriwara',
        'WiFi: Triwara_Guest | Pass: kopienakbanget',
      ],
      pinHash: defaultPinHash,
    });

    // 4. Categories
    const catKopiId = (await database.categories.add({ name: 'Kopi', sortOrder: 1 })) as number;
    const catNonKopiId = (await database.categories.add({ name: 'Non-Kopi', sortOrder: 2 })) as number;
    const catManualBrewId = (await database.categories.add({ name: 'Manual Brew', sortOrder: 3 })) as number;
    const catSnackId = (await database.categories.add({ name: 'Makanan & Snack', sortOrder: 4 })) as number;

    // 5. Ingredients (Generous initial stock so user can test checkout freely)
    const beansEspressoId = (await database.ingredients.add({
      name: 'Biji Kopi Espresso Blend',
      category: 'raw',
      unit: 'gr',
      currentStock: 35000,
      minStock: 1000,
      costPerUnit: 200, // Rp 200/gr
      purchasePackageName: 'Bag 1kg Roastery',
      purchasePrice: 200000,
      purchaseQuantity: 1000,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const beansArabicaId = (await database.ingredients.add({
      name: 'Biji Kopi Arabica Gayo',
      category: 'raw',
      unit: 'gr',
      currentStock: 20000,
      minStock: 500,
      costPerUnit: 260, // Rp 260/gr
      purchasePackageName: 'Bag 1kg Single Origin',
      purchasePrice: 260000,
      purchaseQuantity: 1000,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const milkFreshId = (await database.ingredients.add({
      name: 'Susu Fresh Milk UHT',
      category: 'raw',
      unit: 'ml',
      currentStock: 50000,
      minStock: 2000,
      costPerUnit: 22, // Rp 22/ml
      purchasePackageName: 'Karton 1 Liter',
      purchasePrice: 22000,
      purchaseQuantity: 1000,
      createdAt: now,
      updatedAt: now,
    })) as number;

    await database.ingredients.add({
      name: 'Susu Oat Milk Barista',
      category: 'raw',
      unit: 'ml',
      currentStock: 20000,
      minStock: 1000,
      costPerUnit: 45, // Rp 45/ml
      purchasePackageName: 'Karton 1 Liter',
      purchasePrice: 45000,
      purchaseQuantity: 1000,
      createdAt: now,
      updatedAt: now,
    });

    const syrupArenId = (await database.ingredients.add({
      name: 'Sirup Gula Aren Asli',
      category: 'raw',
      unit: 'ml',
      currentStock: 20000,
      minStock: 1000,
      costPerUnit: 35, // Rp 35/ml
      purchasePackageName: 'Botol 1 Liter',
      purchasePrice: 35000,
      purchaseQuantity: 1000,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const syrupVanillaId = (await database.ingredients.add({
      name: 'Sirup Vanilla Monin',
      category: 'raw',
      unit: 'ml',
      currentStock: 10000,
      minStock: 500,
      costPerUnit: 70, // Rp 70/ml
      purchasePackageName: 'Botol 750ml',
      purchasePrice: 52500,
      purchaseQuantity: 750,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const syrupCaramelId = (await database.ingredients.add({
      name: 'Sirup Karamel',
      category: 'raw',
      unit: 'ml',
      currentStock: 10000,
      minStock: 500,
      costPerUnit: 65, // Rp 65/ml
      purchasePackageName: 'Botol 750ml',
      purchasePrice: 48750,
      purchaseQuantity: 750,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const powderMatchaId = (await database.ingredients.add({
      name: 'Pure Matcha Powder Uji',
      category: 'raw',
      unit: 'gr',
      currentStock: 8000,
      minStock: 300,
      costPerUnit: 250, // Rp 250/gr
      purchasePackageName: 'Pouch 500gr',
      purchasePrice: 125000,
      purchaseQuantity: 500,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const powderChocoId = (await database.ingredients.add({
      name: 'Bubuk Coklat Belgia Dark',
      category: 'raw',
      unit: 'gr',
      currentStock: 10000,
      minStock: 500,
      costPerUnit: 120, // Rp 120/gr
      purchasePackageName: 'Pouch 1kg',
      purchasePrice: 120000,
      purchaseQuantity: 1000,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const croissantDoughId = (await database.ingredients.add({
      name: 'Adonan Croissant Butter',
      category: 'raw',
      unit: 'pcs',
      currentStock: 200,
      minStock: 20,
      costPerUnit: 7000,
      purchasePackageName: 'Box 50 pcs',
      purchasePrice: 350000,
      purchaseQuantity: 50,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const breadLoafId = (await database.ingredients.add({
      name: 'Roti Tawar Gandum',
      category: 'raw',
      unit: 'pcs',
      currentStock: 150,
      minStock: 15,
      costPerUnit: 4000,
      purchasePackageName: 'Pack 10 pcs',
      purchasePrice: 40000,
      purchaseQuantity: 10,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const paperCupId = (await database.ingredients.add({
      name: 'Paper Cup 8oz + Tutup',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 3000,
      minStock: 200,
      costPerUnit: 650, // Rp 650/pcs
      purchasePackageName: 'Slop 50 pcs',
      purchasePrice: 32500,
      purchaseQuantity: 50,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const plasticCupId = (await database.ingredients.add({
      name: 'Plastic Cup 16oz Sablon + Lid',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 4000,
      minStock: 300,
      costPerUnit: 800, // Rp 800/pcs
      purchasePackageName: 'Dus 500 pcs',
      purchasePrice: 400000,
      purchaseQuantity: 500,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const strawId = (await database.ingredients.add({
      name: 'Sedotan Steril Higienis',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 5000,
      minStock: 500,
      costPerUnit: 100, // Rp 100/pcs
      purchasePackageName: 'Pack 100 pcs',
      purchasePrice: 10000,
      purchaseQuantity: 100,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const snackBoxId = (await database.ingredients.add({
      name: 'Box Snack Kraft Paper',
      category: 'packaging',
      unit: 'pcs',
      currentStock: 1000,
      minStock: 100,
      costPerUnit: 1200,
      purchasePackageName: 'Pack 50 pcs',
      purchasePrice: 60000,
      purchaseQuantity: 50,
      createdAt: now,
      updatedAt: now,
    })) as number;

    // 6. Products Definitions (Coffee, Non-Coffee, Manual Brew, Snacks)
    const productDefs: Array<{
      categoryId: number;
      name: string;
      price: number;
      description: string;
      recipe: IRecipeItem[];
      takeawayPackaging: IRecipeItem[];
      availableAdditionals: IProductAdditional[];
    }> = [
      {
        categoryId: catKopiId,
        name: 'Kopi Susu Aren',
        price: 18000,
        description: 'Espresso bold berpadu susu segar dan gula aren alami murni',
        recipe: [
          { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
          { ingredientId: milkFreshId, amount: 120, unit: 'ml' },
          { ingredientId: syrupArenId, amount: 25, unit: 'ml' },
        ],
        takeawayPackaging: [
          { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
          { ingredientId: strawId, amount: 1, unit: 'pcs' },
        ],
        availableAdditionals: [
          { name: 'Extra Shot Espresso', price: 4000, ingredientId: beansEspressoId, amount: 9 },
          { name: 'Extra Aren Syrup', price: 3000, ingredientId: syrupArenId, amount: 15 },
        ],
      },
      {
        categoryId: catKopiId,
        name: 'Caffe Latte',
        price: 22000,
        description: 'Single espresso dipadukan dengan steamed fresh milk bertekstur lembut',
        recipe: [
          { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
          { ingredientId: milkFreshId, amount: 180, unit: 'ml' },
        ],
        takeawayPackaging: [
          { ingredientId: paperCupId, amount: 1, unit: 'pcs' },
        ],
        availableAdditionals: [
          { name: 'Vanilla Syrup', price: 4000, ingredientId: syrupVanillaId, amount: 15 },
          { name: 'Caramel Syrup', price: 4000, ingredientId: syrupCaramelId, amount: 15 },
        ],
      },
      {
        categoryId: catKopiId,
        name: 'Americano Classic',
        price: 15000,
        description: 'Espresso ganda diseduh dengan air murni, cita rasa kopi pekat dan segar',
        recipe: [{ ingredientId: beansEspressoId, amount: 18, unit: 'gr' }],
        takeawayPackaging: [
          { ingredientId: paperCupId, amount: 1, unit: 'pcs' },
        ],
        availableAdditionals: [
          { name: 'Extra Shot Espresso', price: 4000, ingredientId: beansEspressoId, amount: 9 },
        ],
      },
      {
        categoryId: catKopiId,
        name: 'Caramel Macchiato',
        price: 25000,
        description: 'Susu vanila lembut diberi lapisan espresso dan siraman saus karamel lezat',
        recipe: [
          { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
          { ingredientId: milkFreshId, amount: 150, unit: 'ml' },
          { ingredientId: syrupVanillaId, amount: 15, unit: 'ml' },
          { ingredientId: syrupCaramelId, amount: 20, unit: 'ml' },
        ],
        takeawayPackaging: [
          { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
          { ingredientId: strawId, amount: 1, unit: 'pcs' },
        ],
        availableAdditionals: [
          { name: 'Extra Caramel Drizzle', price: 3500, ingredientId: syrupCaramelId, amount: 15 },
        ],
      },
      {
        categoryId: catNonKopiId,
        name: 'Matcha Latte Creamy',
        price: 24000,
        description: 'Matcha autentik Jepang berpadu dengan susu segar menghasilkan rasa gurih lembut',
        recipe: [
          { ingredientId: powderMatchaId, amount: 12, unit: 'gr' },
          { ingredientId: milkFreshId, amount: 160, unit: 'ml' },
        ],
        takeawayPackaging: [
          { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
          { ingredientId: strawId, amount: 1, unit: 'pcs' },
        ],
        availableAdditionals: [
          { name: 'Extra Shot Matcha', price: 5000, ingredientId: powderMatchaId, amount: 8 },
        ],
      },
      {
        categoryId: catNonKopiId,
        name: 'Signature Chocolate',
        price: 23000,
        description: 'Coklat Belgia pekat dengan rasa creamy susu yang memanjakan',
        recipe: [
          { ingredientId: powderChocoId, amount: 25, unit: 'gr' },
          { ingredientId: milkFreshId, amount: 150, unit: 'ml' },
        ],
        takeawayPackaging: [
          { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
          { ingredientId: strawId, amount: 1, unit: 'pcs' },
        ],
        availableAdditionals: [
          { name: 'Extra Choco Powder', price: 4000, ingredientId: powderChocoId, amount: 15 },
        ],
      },
      {
        categoryId: catManualBrewId,
        name: 'V60 Filter Coffee',
        price: 25000,
        description: 'Seduhan manual biji kopi Arabica Gayo dengan aroma fruity floral',
        recipe: [{ ingredientId: beansArabicaId, amount: 15, unit: 'gr' }],
        takeawayPackaging: [{ ingredientId: paperCupId, amount: 1, unit: 'pcs' }],
        availableAdditionals: [
          { name: 'Extra Beans', price: 5000, ingredientId: beansArabicaId, amount: 5 },
        ],
      },
      {
        categoryId: catSnackId,
        name: 'Croissant Butter French',
        price: 18000,
        description: 'Roti croissant panggang renyah berlapis mentega Prancis wangi',
        recipe: [{ ingredientId: croissantDoughId, amount: 1, unit: 'pcs' }],
        takeawayPackaging: [{ ingredientId: snackBoxId, amount: 1, unit: 'pcs' }],
        availableAdditionals: [],
      },
      {
        categoryId: catSnackId,
        name: 'Roti Bakar Coklat Keju',
        price: 20000,
        description: 'Roti bakar empuk isi limpahan coklat Belgia dan parutan keju gurih',
        recipe: [
          { ingredientId: breadLoafId, amount: 1, unit: 'pcs' },
          { ingredientId: powderChocoId, amount: 15, unit: 'gr' },
        ],
        takeawayPackaging: [{ ingredientId: snackBoxId, amount: 1, unit: 'pcs' }],
        availableAdditionals: [],
      },
    ];

    const createdProducts = [];
    for (const def of productDefs) {
      const prodId = (await database.products.add({
        ...def,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })) as number;

      createdProducts.push({
        ...def,
        id: prodId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Optional Demo Orders & Past Shifts (Only generated if explicitly requested)
    if (totalOrders > 0) {
      const customerNames = [
        'Budi Santoso', 'Rian Hidayat', 'Siti Rahma', 'Dewi Lestari', 'Andi Pratama',
        'Fajar Nugraha', 'Maya Indah', 'Reza Kurnia', 'Sarah Amelia', 'Dimas Arya',
        'Agus Wijaya', 'Putri Ayu', 'Bayu Setiawan', 'Nadia Safitri', 'Umum',
        'Ilham Ramadhan', 'Dian Permata', 'Rizky Pratama', 'Bella Saphira', 'Eko Prasetyo',
        'Hendro Gunawan', 'Melisa Tan', 'Rangga Sasana', 'Kirana Putri', 'Doni Kusuma',
      ];

      const startTimestamp = nowMs - 30 * 24 * 60 * 60 * 1000;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      const timestamps: number[] = [];

      const pastOrdersTarget = Math.max(0, totalOrders - 35);
      for (let i = 0; i < pastOrdersTarget; i++) {
        const randomDayMs = startTimestamp + Math.random() * (todayStartMs - startTimestamp);
        const dateObj = new Date(randomDayMs);
        const hour = 8 + Math.floor(Math.random() * 14);
        const minute = Math.floor(Math.random() * 60);
        dateObj.setHours(hour, minute, Math.floor(Math.random() * 60));
        timestamps.push(dateObj.getTime());
      }

      const todayOrdersTarget = Math.min(totalOrders, 35);
      for (let i = 0; i < todayOrdersTarget; i++) {
        const dateObj = new Date();
        const hour = 8 + Math.floor(Math.random() * 14);
        const minute = Math.floor(Math.random() * 60);
        dateObj.setHours(hour, minute, Math.floor(Math.random() * 60));
        timestamps.push(dateObj.getTime());
      }

      timestamps.sort((a, b) => a - b);

      const dailySeqMap = new Map<string, number>();
      const ordersToInsert: IOrder[] = [];

      for (let i = 0; i < totalOrders; i++) {
        const orderDate = new Date(timestamps[i]);
        const yyyy = orderDate.getFullYear();
        const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
        const dd = String(orderDate.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}${mm}${dd}`;

        const dailySeq = (dailySeqMap.get(dateKey) || 0) + 1;
        dailySeqMap.set(dateKey, dailySeq);

        const orderNumber = `TRW-${dateKey}-${String(dailySeq).padStart(3, '0')}`;
        const globalSeq = i + 1;
        const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
        const processedBy = Math.random() > 0.35 ? 'Budi (Kasir)' : 'Owner Toko';
        const paymentMethod: PaymentMethod = Math.random() > 0.45 ? 'cash' : 'qris';
        const isVoided = Math.random() < 0.035;

        const itemCount = Math.random() > 0.7 ? (Math.random() > 0.6 ? 3 : 2) : 1;
        const orderItems: IOrderItem[] = [];
        let subtotal = 0;
        let hppTotal = 0;

        for (let j = 0; j < itemCount; j++) {
          const randIdx = Math.random() < 0.45 ? 0 : Math.floor(Math.random() * createdProducts.length);
          const prod = createdProducts[randIdx];
          const qty = Math.random() > 0.85 ? 2 : 1;
          const itemSubtotal = prod.price * qty;

          let itemHppUnit = 0;
          for (const r of prod.recipe) {
            itemHppUnit += (r.amount || 0) * 150;
          }
          itemHppUnit = Math.max(itemHppUnit, prod.price * 0.35);

          orderItems.push({
            productId: prod.id!,
            productName: prod.name,
            price: prod.price,
            hpp: itemHppUnit,
            qty,
            subtotal: itemSubtotal,
            hppSubtotal: itemHppUnit * qty,
            orderType: Math.random() > 0.5 ? 'dine_in' : 'takeaway',
            toppings: [],
            notes: Math.random() > 0.85 ? 'Less ice, normal sugar' : '',
          });

          subtotal += itemSubtotal;
          hppTotal += itemHppUnit * qty;
        }

        const hasDiscount = Math.random() < 0.08;
        const discountPercent = hasDiscount ? 10 : 0;
        const discountAmount = hasDiscount ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal - discountAmount;

        let paymentAmount = total;
        let changeAmount = 0;
        if (paymentMethod === 'cash') {
          if (total <= 20000) paymentAmount = 20000;
          else if (total <= 50000) paymentAmount = 50000;
          else if (total <= 100000) paymentAmount = 100000;
          else paymentAmount = Math.ceil(total / 50000) * 50000;
          changeAmount = Math.max(0, paymentAmount - total);
        }

        const status: TransactionStatus = isVoided ? 'voided' : 'completed';

        ordersToInsert.push({
          orderNumber,
          sequenceNumber: globalSeq,
          customerName: customer,
          processedBy,
          items: orderItems,
          subtotal,
          discountPercent,
          discountAmount,
          total,
          hppTotal,
          profit: isVoided ? 0 : total - hppTotal,
          paymentMethod,
          paymentAmount,
          changeAmount,
          status,
          voidedAt: isVoided ? new Date(orderDate.getTime() + 12 * 60 * 1000) : undefined,
          voidReason: isVoided ? 'Pelanggan salah memilih pesanan / batal' : undefined,
          createdAt: orderDate,
        });
      }

      await database.orders.bulkAdd(ordersToInsert);

      // Past Closed Shifts
      const shiftDaysAgo = [7, 5, 3, 2, 1];
      const pastShifts = shiftDaysAgo.map((daysAgo, idx) => {
        const openDate = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000);
        openDate.setHours(8, 0, 0, 0);
        const closeDate = new Date(openDate);
        closeDate.setHours(21, 30, 0, 0);

        const yyyy = openDate.getFullYear();
        const mm = String(openDate.getMonth() + 1).padStart(2, '0');
        const dd = String(openDate.getDate()).padStart(2, '0');
        const shiftNumber = `SHF-${yyyy}${mm}${dd}-${String(idx + 1).padStart(3, '0')}`;

        const cashSales = 480000 + idx * 45000;
        const qrisSales = 720000 + idx * 70000;
        const startingCash = 100000;
        const expectedEndingCash = startingCash + cashSales;
        const actualEndingCash = expectedEndingCash;

        return {
          shiftNumber,
          cashierId: 2,
          cashierName: 'Budi (Kasir)',
          startingCash,
          totalCashSales: cashSales,
          totalQrisSales: qrisSales,
          totalVoided: idx % 2 === 0 ? 1 : 0,
          totalTransactions: 32 + idx * 5,
          cashTransactions: 16 + idx * 2,
          qrisTransactions: 16 + idx * 3,
          expectedEndingCash,
          actualEndingCash,
          cashDifference: 0,
          notes: 'Shift berjalan lancar, rekap kas pas tanpa selisih.',
          status: 'closed' as const,
          openedAt: openDate,
          closedAt: closeDate,
        };
      });

      await database.shifts.bulkAdd(pastShifts);
    }

    // 8. Initial System Notifications
    await database.notifications.bulkAdd([
      {
        title: 'Database Siap Digunakan',
        message: 'Menu siap jual dan inventori stok bahan baku telah disiapkan.',
        type: 'product',
        targetTab: 'pos',
        createdAt: now,
        isRead: false,
      },
    ]);
  } finally {
    isSeedingInProgress = false;
  }
}

export async function seedDatabaseIfEmpty(): Promise<void> {
  if (isSeedingInProgress) return;
  const count = await db.products.count();
  if (count === 0) {
    await resetAndSeedDatabase(db, 0);
    return;
  }

  // Ensure default staff exists for existing databases upgrading to v2
  const staffCount = await db.staff.count();
  if (staffCount === 0) {
    await db.staff.bulkAdd([
      {
        name: 'Owner Toko',
        pin: '0000',
        role: 'owner',
        active: true,
        createdAt: new Date(),
      },
      {
        name: 'Budi (Kasir)',
        pin: '1234',
        role: 'cashier',
        active: true,
        createdAt: new Date(),
      },
    ]);
  }
}

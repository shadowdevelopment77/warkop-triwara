// ═══════════════════════════════════════════════
// Triwara POS — Comprehensive Database Seeder (400 Orders)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from './db';
import { hashPin } from '../utils/hash';
import type { IOrder, IOrderItem, IRecipeItem, IProductAdditional, PaymentMethod, TransactionStatus } from '../types';

let isSeedingInProgress = false;

export async function resetAndSeedDatabase(database: TriwaraDatabase = db, totalOrders = 400): Promise<void> {
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

  // 2. Shop Configuration
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
      'WiFi: Triwara_Guest',
      'Pass: kopienakbanget',
    ],
    pinHash: defaultPinHash,
  });

  // 3. Categories
  const catKopiId = (await database.categories.add({ name: 'Kopi', sortOrder: 1 })) as number;
  const catNonKopiId = (await database.categories.add({ name: 'Non-Kopi', sortOrder: 2 })) as number;
  const catManualBrewId = (await database.categories.add({ name: 'Manual Brew', sortOrder: 3 })) as number;
  await database.categories.add({ name: 'Makanan & Snack', sortOrder: 4 });

  // 4. Ingredients (Generous initial stock so user can test checkout freely)
  const now = new Date();

  const beansEspressoId = (await database.ingredients.add({
    name: 'Biji Kopi Espresso Blend',
    category: 'raw',
    unit: 'gr',
    currentStock: 25000,
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
    currentStock: 15000,
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
    currentStock: 40000,
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
    currentStock: 15000,
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
    currentStock: 15000,
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
    currentStock: 8000,
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
    currentStock: 8000,
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
    currentStock: 5000,
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
    currentStock: 6000,
    minStock: 500,
    costPerUnit: 120, // Rp 120/gr
    purchasePackageName: 'Pouch 1kg',
    purchasePrice: 120000,
    purchaseQuantity: 1000,
    createdAt: now,
    updatedAt: now,
  })) as number;

  const paperCupId = (await database.ingredients.add({
    name: 'Paper Cup 8oz + Tutup',
    category: 'packaging',
    unit: 'pcs',
    currentStock: 1500,
    minStock: 100,
    costPerUnit: 1200,
    purchasePackageName: 'Dus 500 pcs',
    purchasePrice: 600000,
    purchaseQuantity: 500,
    createdAt: now,
    updatedAt: now,
  })) as number;

  const plasticCupId = (await database.ingredients.add({
    name: 'Cold Cup Plastik 16oz + Tutup',
    category: 'packaging',
    unit: 'pcs',
    currentStock: 2000,
    minStock: 150,
    costPerUnit: 1500,
    purchasePackageName: 'Dus 500 pcs',
    purchasePrice: 750000,
    purchaseQuantity: 500,
    createdAt: now,
    updatedAt: now,
  })) as number;

  const strawId = (await database.ingredients.add({
    name: 'Sedotan Steril Higienis',
    category: 'packaging',
    unit: 'pcs',
    currentStock: 3000,
    minStock: 200,
    costPerUnit: 200,
    purchasePackageName: 'Pack 100 pcs',
    purchasePrice: 20000,
    purchaseQuantity: 100,
    createdAt: now,
    updatedAt: now,
  })) as number;

  // 5. Products & Linked Recipes
  type ProductSeedDef = {
    categoryId: number;
    name: string;
    price: number;
    description: string;
    recipe: IRecipeItem[];
    takeawayPackaging: IRecipeItem[];
    availableAdditionals?: IProductAdditional[];
  };

  const productDefs: ProductSeedDef[] = [
    {
      categoryId: catKopiId,
      name: 'Kopi Susu Aren',
      price: 20000,
      description: 'Espresso double dengan susu segar dan sirup gula aren asli',
      recipe: [
        { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
        { ingredientId: milkFreshId, amount: 100, unit: 'ml' },
        { ingredientId: syrupArenId, amount: 25, unit: 'ml' },
      ],
      takeawayPackaging: [
        { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
        { ingredientId: strawId, amount: 1, unit: 'pcs' },
      ],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansEspressoId, amount: 18 },
        { name: 'Extra Gula Aren', price: 3000, ingredientId: syrupArenId, amount: 15 },
      ],
    },
    {
      categoryId: catKopiId,
      name: 'Americano',
      price: 18000,
      description: 'Double espressoshot disajikan dingin segar atau panas',
      recipe: [{ ingredientId: beansEspressoId, amount: 18, unit: 'gr' }],
      takeawayPackaging: [{ ingredientId: plasticCupId, amount: 1, unit: 'pcs' }],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansEspressoId, amount: 18 },
      ],
    },
    {
      categoryId: catKopiId,
      name: 'Caffe Latte',
      price: 24000,
      description: 'Espresso lembut berpadu dengan susu steam gurih halus',
      recipe: [
        { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
        { ingredientId: milkFreshId, amount: 150, unit: 'ml' },
      ],
      takeawayPackaging: [
        { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
        { ingredientId: strawId, amount: 1, unit: 'pcs' },
      ],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansEspressoId, amount: 18 },
        { name: 'Upgrade Oat Milk', price: 6000, ingredientId: milkFreshId, amount: 60 },
        { name: 'Syrup Vanilla', price: 4000, ingredientId: syrupVanillaId, amount: 15 },
        { name: 'Syrup Caramel', price: 4000, ingredientId: syrupCaramelId, amount: 15 },
      ],
    },
    {
      categoryId: catKopiId,
      name: 'Cappuccino',
      price: 24000,
      description: 'Kopi klasik dengan foam susu tebal dan aroma espresso pekat',
      recipe: [
        { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
        { ingredientId: milkFreshId, amount: 120, unit: 'ml' },
      ],
      takeawayPackaging: [{ ingredientId: paperCupId, amount: 1, unit: 'pcs' }],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansEspressoId, amount: 18 },
        { name: 'Extra Choco Dust', price: 2000, ingredientId: powderChocoId, amount: 5 },
      ],
    },
    {
      categoryId: catKopiId,
      name: 'Caramel Macchiato',
      price: 26000,
      description: 'Espresso, susu segar, sirup vanilla dengan drizzle karamel manis',
      recipe: [
        { ingredientId: beansEspressoId, amount: 18, unit: 'gr' },
        { ingredientId: milkFreshId, amount: 120, unit: 'ml' },
        { ingredientId: syrupVanillaId, amount: 10, unit: 'ml' },
        { ingredientId: syrupCaramelId, amount: 15, unit: 'ml' },
      ],
      takeawayPackaging: [
        { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
        { ingredientId: strawId, amount: 1, unit: 'pcs' },
      ],
      availableAdditionals: [
        { name: 'Extra Shot Espresso', price: 5000, ingredientId: beansEspressoId, amount: 18 },
        { name: 'Extra Drizzle Caramel', price: 3000, ingredientId: syrupCaramelId, amount: 15 },
      ],
    },
    {
      categoryId: catNonKopiId,
      name: 'Matcha Latte Ice',
      price: 25000,
      description: 'Matcha murni Uji Jepang dipadu dengan susu segar dingin',
      recipe: [
        { ingredientId: powderMatchaId, amount: 15, unit: 'gr' },
        { ingredientId: milkFreshId, amount: 150, unit: 'ml' },
      ],
      takeawayPackaging: [
        { ingredientId: plasticCupId, amount: 1, unit: 'pcs' },
        { ingredientId: strawId, amount: 1, unit: 'pcs' },
      ],
      availableAdditionals: [
        { name: 'Extra Shot Matcha', price: 5000, ingredientId: powderMatchaId, amount: 10 },
        { name: 'Upgrade Oat Milk', price: 6000, ingredientId: milkFreshId, amount: 60 },
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
        { name: 'Upgrade Oat Milk', price: 6000, ingredientId: milkFreshId, amount: 60 },
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

  // 6. Generate 400 Realistic Orders Across Past 30 Days
  const customerNames = [
    'Budi Santoso', 'Rian Hidayat', 'Siti Rahma', 'Dewi Lestari', 'Andi Pratama',
    'Fajar Nugraha', 'Maya Indah', 'Reza Kurnia', 'Sarah Amelia', 'Dimas Arya',
    'Agus Wijaya', 'Putri Ayu', 'Bayu Setiawan', 'Nadia Safitri', 'Umum',
  ];

  // Distribute order dates across the last 30 days
  const ordersToInsert: IOrder[] = [];
  const startTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
  const endTimestamp = Date.now();

  // Create an array of random timestamps and sort them chronologically
  const timestamps: number[] = [];
  for (let i = 0; i < totalOrders; i++) {
    const randomMs = startTimestamp + Math.random() * (endTimestamp - startTimestamp);
    const dateObj = new Date(randomMs);
    // Set realistic coffee shop operating hours (08:30 - 22:00)
    const hour = 8 + Math.floor(Math.random() * 14);
    const minute = Math.floor(Math.random() * 60);
    dateObj.setHours(hour, minute, Math.floor(Math.random() * 60));
    timestamps.push(dateObj.getTime());
  }
  timestamps.sort((a, b) => a - b);

  // Group by calendar day to compute sequential numbers (TRW-YYYYMMDD-001, 002...)
  const dailySeqMap = new Map<string, number>();

  for (let i = 0; i < totalOrders; i++) {
    const orderDate = new Date(timestamps[i]);
    const yyyy = orderDate.getFullYear();
    const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
    const dd = String(orderDate.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}${mm}${dd}`;

    const seq = (dailySeqMap.get(dateKey) || 0) + 1;
    dailySeqMap.set(dateKey, seq);

    const orderNumber = `TRW-${dateKey}-${String(seq).padStart(3, '0')}`;
    const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
    const paymentMethod: PaymentMethod = Math.random() > 0.4 ? 'cash' : 'qris';
    const isVoided = Math.random() < 0.04; // ~4% void rate

    // Choose 1 to 3 items
    const itemCount = Math.random() > 0.75 ? (Math.random() > 0.5 ? 3 : 2) : 1;
    const orderItems: IOrderItem[] = [];
    let subtotal = 0;
    let hppTotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const prod = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const qty = Math.random() > 0.85 ? 2 : 1;
      const orderType = Math.random() > 0.5 ? 'takeaway' : 'dine_in';

      // Estimate base HPP
      let unitHpp = 0;
      for (const rec of prod.recipe) {
        if (rec.ingredientId === beansEspressoId) unitHpp += rec.amount * 200;
        else if (rec.ingredientId === beansArabicaId) unitHpp += rec.amount * 260;
        else if (rec.ingredientId === milkFreshId) unitHpp += rec.amount * 22;
        else if (rec.ingredientId === syrupArenId) unitHpp += rec.amount * 35;
        else if (rec.ingredientId === syrupVanillaId) unitHpp += rec.amount * 70;
        else if (rec.ingredientId === syrupCaramelId) unitHpp += rec.amount * 65;
        else if (rec.ingredientId === powderMatchaId) unitHpp += rec.amount * 250;
        else if (rec.ingredientId === powderChocoId) unitHpp += rec.amount * 120;
      }
      if (orderType === 'takeaway') {
        unitHpp += 1500; // cup packaging
      }

      const itemSubtotal = prod.price * qty;
      const itemHppSubtotal = unitHpp * qty;
      subtotal += itemSubtotal;
      hppTotal += itemHppSubtotal;

      orderItems.push({
        productId: prod.id,
        productName: prod.name,
        price: prod.price,
        hpp: unitHpp,
        qty,
        orderType,
        subtotal: itemSubtotal,
        hppSubtotal: itemHppSubtotal,
        toppings: [],
        notes: '',
      });
    }

    const discountPercent = Math.random() < 0.15 ? 10 : 0;
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const total = subtotal - discountAmount;
    const paymentAmount = paymentMethod === 'cash' ? Math.ceil(total / 10000) * 10000 : total;
    const changeAmount = paymentMethod === 'cash' ? paymentAmount - total : 0;
    const status: TransactionStatus = isVoided ? 'voided' : 'completed';

    ordersToInsert.push({
      orderNumber,
      sequenceNumber: seq,
      customerName: customer,
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
      voidedAt: isVoided ? new Date(orderDate.getTime() + 15 * 60 * 1000) : undefined,
      voidReason: isVoided ? 'Pelanggan membatalkan pesanan' : undefined,
      createdAt: orderDate,
    });
  }

  await database.orders.bulkAdd(ordersToInsert);

    // 7. Initial System Notifications
    await database.notifications.bulkAdd([
      {
        title: 'Database & Demo Siap',
        message: `Database berhasil direset dengan 8 menu siap jual dan 400 transaksi demo.`,
        type: 'product',
        targetTab: 'reports',
        createdAt: new Date(),
        isRead: false,
      },
      {
        title: 'Stok Bahan Aman',
        message: 'Seluruh stok bahan baku dan kemasan terisi penuh untuk pengujian kasir.',
        type: 'inventory',
        targetTab: 'inventory',
        createdAt: new Date(),
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
    await resetAndSeedDatabase(db, 400);
  }
}

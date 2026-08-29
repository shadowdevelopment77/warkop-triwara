// ═══════════════════════════════════════════════
// Triwara POS — Database Initial Seeder
// ═══════════════════════════════════════════════

import { db } from './db';
import { hashPin } from '../utils/hash';

export async function seedDatabaseIfEmpty(): Promise<void> {
  const configCount = await db.shopConfig.count();

  if (configCount === 0) {
    const defaultPinHash = await hashPin('0000'); // Default PIN: 0000

    await db.shopConfig.add({
      appName: 'Triwara POS',
      receiptHeaderLines: [
        'Warkop Triwara',
        'Jl. Contoh No. 123, Bali',
        'Telp: 0812-3456-7890',
      ],
      receiptFooterLines: [
        'Terima Kasih!',
        'Sampai Jumpa Kembali',
        'WiFi: WarkopTriwara',
        'Pass: kopi12345',
      ],
      pinHash: defaultPinHash,
    });
  }

  // Seed default categories if empty
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    await db.categories.bulkAdd([
      { name: 'Kopi', sortOrder: 1 },
      { name: 'Non-Kopi', sortOrder: 2 },
      { name: 'Pastry & Makanan', sortOrder: 3 },
    ]);
  }
}

// ═══════════════════════════════════════════════
// Triwara POS — Shop Configuration & Security Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IShopConfig } from '../types';
import { hashPin } from '../utils/hash';
import { initializeProductionDatabaseIfNeeded } from '../database/seed';

export class ConfigService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Gets current shop configuration */
  async getConfig(): Promise<IShopConfig> {
    await initializeProductionDatabaseIfNeeded();
    const configs = await this.database.shopConfig.toArray();
    if (configs.length > 0) {
      return configs[0];
    }
    throw new Error('Shop config not initialized');
  }

  /** Verifies input PIN against stored hash */
  async verifyPin(inputPin: string): Promise<boolean> {
    const config = await this.getConfig();
    const inputHash = await hashPin(inputPin);
    return config.pinHash === inputHash;
  }

  /** Updates PIN */
  async updatePin(oldPin: string, newPin: string): Promise<void> {
    const isOldValid = await this.verifyPin(oldPin);
    if (!isOldValid) {
      throw new Error('PIN lama tidak sesuai');
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      throw new Error('PIN baru harus 4 digit angka');
    }

    const config = await this.getConfig();
    const newHash = await hashPin(newPin);

    await this.database.shopConfig.update(config.id!, {
      pinHash: newHash,
    });
  }

  /** Updates shop branding and receipt configuration */
  async updateConfig(partialConfig: Partial<IShopConfig>): Promise<void> {
    const config = await this.getConfig();
    await this.database.shopConfig.update(config.id!, partialConfig);
  }
}

export const configService = new ConfigService();

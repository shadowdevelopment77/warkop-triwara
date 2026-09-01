// ═══════════════════════════════════════════════
// Triwara POS — Offline Multi-Stage Tempo License Service
// ═══════════════════════════════════════════════

export type LicenseStage = 'tempo_1' | 'tempo_2' | 'lifetime';

export interface ILicenseInfo {
  stage: LicenseStage;
  expiresAt: string | null; // ISO string or null for lifetime
  isLocked: boolean;
  lockReason?: string;
  isSimulatedLock?: boolean;
}

const STORAGE_KEY = 'triwara_license_data';
const LAST_TS_KEY = 'triwara_last_known_ts';

class StorageAdapter {
  private memoryMap = new Map<string, string>();

  getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.memoryMap.get(key) || null;
      }
    }
    return this.memoryMap.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Fallback
      }
    }
    this.memoryMap.set(key, value);
  }

  removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Fallback
      }
    }
    this.memoryMap.delete(key);
  }
}

const licenseStorage = new StorageAdapter();

// Secret Activation Keys (Offline Verification)
export const ACTIVATION_KEYS = {
  STAGE_1_EXTEND: 'TRW-OKT-2026',      // Extends deadline to Nov 5, 2026
  STAGE_2_LIFETIME: 'TRW-LIFETIME-PASS', // Permanently unlocks lifetime license
};

export class LicenseService {
  private listeners: Array<(info: ILicenseInfo) => void> = [];

  /**
   * Reads current license state from persistent storage, or initializes default (Tempo 1)
   */
  getLicenseInfo(): ILicenseInfo {
    const defaultInfo: ILicenseInfo = {
      stage: 'tempo_1',
      expiresAt: '2026-10-05T00:00:00.000Z',
      isLocked: false,
      isSimulatedLock: false,
    };

    let info: ILicenseInfo;
    try {
      const raw = licenseStorage.getItem(STORAGE_KEY);
      info = raw ? { ...defaultInfo, ...JSON.parse(raw) } : defaultInfo;
    } catch {
      info = defaultInfo;
    }

    // 1. Lifetime license is NEVER locked
    if (info.stage === 'lifetime') {
      info.isLocked = false;
      info.expiresAt = null;
      return info;
    }

    // 2. Simulated lock for dev/test purposes
    if (info.isSimulatedLock) {
      info.isLocked = true;
      info.lockReason = 'simulated';
      return info;
    }

    // 3. System clock anti-rollback check
    const now = new Date();
    const currentTs = now.getTime();
    try {
      const lastKnownTsStr = licenseStorage.getItem(LAST_TS_KEY);
      if (lastKnownTsStr) {
        const lastKnownTs = parseInt(lastKnownTsStr, 10);
        // Allow up to 24h backward jitter (for timezone switching), but detect large month rollbacks
        if (currentTs < lastKnownTs - 24 * 3600 * 1000) {
          info.isLocked = true;
          info.lockReason = 'clock_rollback';
          return info;
        }
      }
      // Record current timestamp monotonically
      licenseStorage.setItem(LAST_TS_KEY, currentTs.toString());
    } catch {
      // Storage unavailable fallback
    }

    // 4. Expiration date check
    if (info.expiresAt) {
      const expiryDate = new Date(info.expiresAt);
      if (now >= expiryDate) {
        info.isLocked = true;
        info.lockReason = 'expired';
        return info;
      }
    }

    info.isLocked = false;
    return info;
  }

  /**
   * Activates a license key (Stage 1 extension or Stage 2 lifetime)
   */
  activateCode(rawCode: string): { success: boolean; message: string; stage?: LicenseStage } {
    const code = rawCode.trim().toUpperCase();
    const current = this.getLicenseInfo();

    if (code === ACTIVATION_KEYS.STAGE_2_LIFETIME) {
      const updated: ILicenseInfo = {
        stage: 'lifetime',
        expiresAt: null,
        isLocked: false,
        isSimulatedLock: false,
      };
      this.saveLicenseInfo(updated);
      this.notifyListeners(updated);
      return {
        success: true,
        message: 'Selamat! Lisensi Permanen (Lifetime) berhasil diaktifkan.',
        stage: 'lifetime',
      };
    }

    if (code === ACTIVATION_KEYS.STAGE_1_EXTEND) {
      if (current.stage === 'lifetime') {
        return {
          success: true,
          message: 'Aplikasi sudah berstatus Lisensi Permanen.',
          stage: 'lifetime',
        };
      }

      const updated: ILicenseInfo = {
        stage: 'tempo_2',
        expiresAt: '2026-11-05T00:00:00.000Z',
        isLocked: false,
        isSimulatedLock: false,
      };
      this.saveLicenseInfo(updated);
      this.notifyListeners(updated);
      return {
        success: true,
        message: 'Cicilan 1 terverifikasi! Masa aktif diperpanjang hingga 5 November 2026.',
        stage: 'tempo_2',
      };
    }

    return {
      success: false,
      message: 'Kode aktivasi tidak valid. Periksa kembali kode yang diberikan oleh developer.',
    };
  }

  /**
   * Developer simulator: Toggles lock screen in localhost environment
   */
  toggleSimulatedLock(force?: boolean): ILicenseInfo {
    const current = this.getLicenseInfo();
    const isSimulated = force !== undefined ? force : !current.isSimulatedLock;
    const updated: ILicenseInfo = {
      ...current,
      isSimulatedLock: isSimulated,
      isLocked: isSimulated || (current.stage !== 'lifetime' && current.isLocked),
      lockReason: isSimulated ? 'simulated' : undefined,
    };
    this.saveLicenseInfo(updated);
    this.notifyListeners(updated);
    return updated;
  }

  /**
   * Resets license state to default (For automated tests or fresh demo)
   */
  resetToDefault(): void {
    licenseStorage.removeItem(STORAGE_KEY);
    licenseStorage.removeItem(LAST_TS_KEY);
    this.notifyListeners(this.getLicenseInfo());
  }

  /**
   * Subscribes to license changes
   */
  subscribe(listener: (info: ILicenseInfo) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private saveLicenseInfo(info: ILicenseInfo): void {
    try {
      licenseStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } catch (err) {
      console.error('Failed to save license info:', err);
    }
  }

  private notifyListeners(info: ILicenseInfo): void {
    this.listeners.forEach((l) => l(info));
  }
}

export const licenseService = new LicenseService();

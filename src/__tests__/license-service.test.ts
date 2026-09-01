import { describe, it, expect, beforeEach } from 'vitest';
import { licenseService, ACTIVATION_KEYS } from '../services/license.service';

describe('Offline Multi-Stage Tempo License Service Tests', () => {
  beforeEach(() => {
    licenseService.resetToDefault();
  });

  it('initializes default license as tempo_1 expiring on 5 October 2026', () => {
    const info = licenseService.getLicenseInfo();
    expect(info.stage).toBe('tempo_1');
    expect(info.expiresAt).toBe('2026-10-05T00:00:00.000Z');
    expect(info.isLocked).toBe(false);
  });

  it('rejects invalid activation codes safely', () => {
    const res = licenseService.activateCode('WRONG-CODE-1234');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Kode aktivasi tidak valid');

    const info = licenseService.getLicenseInfo();
    expect(info.stage).toBe('tempo_1');
  });

  it('activates Stage 1 (Cicilan 1) and extends deadline to 5 November 2026', () => {
    const res = licenseService.activateCode(ACTIVATION_KEYS.STAGE_1_EXTEND);
    expect(res.success).toBe(true);
    expect(res.stage).toBe('tempo_2');
    expect(res.message).toContain('Cicilan 1 terverifikasi');

    const info = licenseService.getLicenseInfo();
    expect(info.stage).toBe('tempo_2');
    expect(info.expiresAt).toBe('2026-11-05T00:00:00.000Z');
    expect(info.isLocked).toBe(false);
  });

  it('activates Stage 2 (Pelunasan Akhir / Lifetime) permanently removing expiration', () => {
    // First activate stage 1
    licenseService.activateCode(ACTIVATION_KEYS.STAGE_1_EXTEND);

    // Then activate lifetime
    const res = licenseService.activateCode(ACTIVATION_KEYS.STAGE_2_LIFETIME);
    expect(res.success).toBe(true);
    expect(res.stage).toBe('lifetime');
    expect(res.message).toContain('Lisensi Permanen');

    const info = licenseService.getLicenseInfo();
    expect(info.stage).toBe('lifetime');
    expect(info.expiresAt).toBeNull();
    expect(info.isLocked).toBe(false);
  });

  it('supports direct lifetime activation bypassing stage 1', () => {
    // Client pays in full upfront
    const res = licenseService.activateCode(ACTIVATION_KEYS.STAGE_2_LIFETIME);
    expect(res.success).toBe(true);
    expect(res.stage).toBe('lifetime');

    const info = licenseService.getLicenseInfo();
    expect(info.stage).toBe('lifetime');
    expect(info.isLocked).toBe(false);
  });

  it('toggles simulation lock and unlocks instantly when valid code is entered', () => {
    // Simulate lock for localhost testing
    const lockedInfo = licenseService.toggleSimulatedLock(true);
    expect(lockedInfo.isLocked).toBe(true);
    expect(lockedInfo.lockReason).toBe('simulated');

    // Entering stage 1 code unlocks it
    const res = licenseService.activateCode(ACTIVATION_KEYS.STAGE_1_EXTEND);
    expect(res.success).toBe(true);

    const unlockedInfo = licenseService.getLicenseInfo();
    expect(unlockedInfo.isLocked).toBe(false);
    expect(unlockedInfo.stage).toBe('tempo_2');
  });
});

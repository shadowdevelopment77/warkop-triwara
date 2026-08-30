// ═══════════════════════════════════════════════
// Triwara POS — Staff & RBAC Authentication Service (OOP)
// ═══════════════════════════════════════════════

import { db, TriwaraDatabase } from '../database/db';
import type { IStaff } from '../types';

export class StaffService {
  private database: TriwaraDatabase;

  constructor(database: TriwaraDatabase = db) {
    this.database = database;
  }

  /** Authenticates staff via 4-digit PIN */
  async authenticate(pin: string): Promise<IStaff | null> {
    const trimmed = pin.trim();
    if (!trimmed || trimmed.length !== 4) return null;

    const staff = await this.database.staff
      .where('pin')
      .equals(trimmed)
      .and((s) => s.active)
      .first();

    return staff || null;
  }

  /** Gets all staff members */
  async getAllStaff(): Promise<IStaff[]> {
    const list = await this.database.staff.toArray();
    return list.sort((a, b) => {
      // Owner first, then name alphabetical
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /** Checks if a 4-digit PIN is available (unique) */
  async isPinAvailable(pin: string, excludeStaffId?: number): Promise<boolean> {
    const trimmed = pin.trim();
    if (!trimmed) return false;

    const existing = await this.database.staff
      .where('pin')
      .equals(trimmed)
      .first();

    if (!existing) return true;
    if (excludeStaffId && existing.id === excludeStaffId) return true;
    return false;
  }

  /** Creates a new staff member with unique PIN validation */
  async createStaff(name: string, pin: string, role: 'owner' | 'cashier' = 'cashier'): Promise<IStaff> {
    const trimmedName = name.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName) {
      throw new Error('Nama karyawan tidak boleh kosong');
    }
    if (!trimmedPin || trimmedPin.length !== 4 || !/^\d{4}$/.test(trimmedPin)) {
      throw new Error('PIN harus terdiri dari 4 digit angka');
    }

    const available = await this.isPinAvailable(trimmedPin);
    if (!available) {
      const existing = await this.database.staff.where('pin').equals(trimmedPin).first();
      throw new Error(`PIN "${trimmedPin}" sudah digunakan oleh ${existing?.name || 'pengguna lain'}. Gunakan PIN berbeda.`);
    }

    const newStaff: IStaff = {
      name: trimmedName,
      pin: trimmedPin,
      role,
      active: true,
      createdAt: new Date(),
    };

    const id = (await this.database.staff.add(newStaff)) as number;

    await this.database.logs.add({
      type: 'shift',
      description: `TAMBAH KARYAWAN: ${trimmedName} (${role.toUpperCase()})`,
      referenceId: String(id),
      createdAt: new Date(),
    });

    return { ...newStaff, id };
  }

  /** Updates staff details with unique PIN validation */
  async updateStaff(id: number, data: Partial<IStaff>): Promise<void> {
    const existing = await this.database.staff.get(id);
    if (!existing) {
      throw new Error('Karyawan tidak ditemukan');
    }

    if (data.pin !== undefined) {
      const trimmedPin = data.pin.trim();
      if (!trimmedPin || trimmedPin.length !== 4 || !/^\d{4}$/.test(trimmedPin)) {
        throw new Error('PIN harus terdiri dari 4 digit angka');
      }

      const available = await this.isPinAvailable(trimmedPin, id);
      if (!available) {
        throw new Error(`PIN "${trimmedPin}" sudah digunakan oleh karyawan lain / Owner. Gunakan PIN berbeda.`);
      }
      data.pin = trimmedPin;
    }

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new Error('Nama karyawan tidak boleh kosong');
      }
      data.name = trimmedName;
    }

    await this.database.staff.update(id, data);

    await this.database.logs.add({
      type: 'shift',
      description: `UPDATE KARYAWAN: ${data.name || existing.name}`,
      referenceId: String(id),
      createdAt: new Date(),
    });
  }

  /** Deletes or deactivates a staff member */
  async deleteStaff(id: number): Promise<void> {
    const staff = await this.database.staff.get(id);
    if (!staff) return;

    if (staff.role === 'owner') {
      const ownerCount = await this.database.staff.where('role').equals('owner').count();
      if (ownerCount <= 1) {
        throw new Error('Akun Owner utama tidak dapat dihapus');
      }
    }

    await this.database.staff.delete(id);

    await this.database.logs.add({
      type: 'shift',
      description: `HAPUS KARYAWAN: ${staff.name}`,
      referenceId: String(id),
      createdAt: new Date(),
    });
  }
}

export const staffService = new StaffService();

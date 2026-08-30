// ═══════════════════════════════════════════════
// Triwara POS — Staff / Employee Management Modal (Owner Only)
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IStaff } from '../../types';
import { staffService } from '../../services/staff.service';

interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffManagerModal: React.FC<StaffManagerModalProps> = ({ isOpen, onClose }) => {
  const [staffList, setStaffList] = useState<IStaff[]>([]);
  const [editingStaff, setEditingStaff] = useState<IStaff | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [role, setRole] = useState<'owner' | 'cashier'>('cashier');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    const list = await staffService.getAllStaff();
    setStaffList(list);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setPin('');
    setRole('cashier');
    setEditingStaff(null);
    setErrorMsg('');
  };

  const handleStartEdit = (staff: IStaff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPin(staff.pin);
    setRole(staff.role);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName) {
      setErrorMsg('Nama karyawan tidak boleh kosong');
      return;
    }
    if (!trimmedPin || trimmedPin.length !== 4 || !/^\d{4}$/.test(trimmedPin)) {
      setErrorMsg('PIN harus terdiri dari 4 digit angka');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingStaff && editingStaff.id) {
        await staffService.updateStaff(editingStaff.id, {
          name: trimmedName,
          pin: trimmedPin,
          role,
        });
        setSuccessMsg(`Data karyawan "${trimmedName}" berhasil diperbarui!`);
      } else {
        await staffService.createStaff(trimmedName, trimmedPin, role);
        setSuccessMsg(`Karyawan baru "${trimmedName}" berhasil ditambahkan!`);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staff: IStaff) => {
    if (!staff.id) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (staff.role === 'owner') {
      const ownerCount = staffList.filter((s) => s.role === 'owner').length;
      if (ownerCount <= 1) {
        setErrorMsg('Akun Owner utama tidak dapat dihapus');
        return;
      }
    }

    try {
      await staffService.deleteStaff(staff.id);
      setSuccessMsg(`Karyawan "${staff.name}" berhasil dihapus.`);
      if (editingStaff?.id === staff.id) {
        resetForm();
      }
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="inv-modal-card"
        style={{ maxWidth: '520px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inv-modal-header">
          <h3 className="inv-modal-title">Kelola Karyawan &amp; Hak Akses PIN</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
            ✕
          </button>
        </div>

        <div className="inv-modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}
          {successMsg && (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                color: '#4ade80',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Form Input / Edit */}
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#a1a1aa' }}>
                {editingStaff ? `EDIT KARYAWAN: ${editingStaff.name}` : '+ TAMBAH KARYAWAN BARU'}
              </span>
              {editingStaff && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    fontSize: '11px',
                    color: '#60a5fa',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 2 }}
                placeholder="Nama Karyawan (cth: Siti)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                type="password"
                maxLength={4}
                className="form-input"
                style={{ width: '90px', textAlign: 'center', fontWeight: 800, letterSpacing: '4px' }}
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
                title="4 Digit Angka PIN"
              />

              <select
                className="form-select"
                style={{ flex: 1.2 }}
                value={role}
                onChange={(e) => setRole(e.target.value as 'owner' | 'cashier')}
              >
                <option value="cashier">Kasir</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <button type="submit" className="inv-btn-primary" disabled={isSubmitting}>
              {editingStaff ? 'Simpan Perubahan Karyawan' : '+ Tambah Karyawan'}
            </button>
          </form>

          {/* Staff List */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>
              Daftar Pengguna ({staffList.length})
            </span>

            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {staffList.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <strong style={{ color: '#fafafa', fontSize: '14px' }}>{s.name}</strong>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: s.role === 'owner' ? '#3b82f6' : '#27272a',
                          color: '#fafafa',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {s.role}
                      </span>
                      <span style={{ fontSize: '12px', color: '#71717a' }}>PIN: ••••</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="shift-btn-action"
                      onClick={() => handleStartEdit(s)}
                      title="Edit Nama / Ganti PIN"
                    >
                      ✏️ Edit
                    </button>
                    {s.role !== 'owner' && (
                      <button
                        type="button"
                        className="menu-btn-icon-danger"
                        onClick={() => handleDelete(s)}
                        title="Hapus Karyawan"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="inv-modal-footer">
          <button type="button" className="inv-btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

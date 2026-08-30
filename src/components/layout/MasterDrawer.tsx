// ═══════════════════════════════════════════════
// Triwara POS — Master Drawer Navigation (~50% Screen Overlay)
// ═══════════════════════════════════════════════

import React from 'react';
import type { IStaff } from '../../types';

export type MasterTab =
  | 'pos'
  | 'transactions'
  | 'shifts'
  | 'inventory' // Folder Produk & Stok -> Bahan & Stok
  | 'products' // Folder Produk & Stok -> Katalog Menu & Resep
  | 'reports'
  | 'logs'
  | 'settings';

interface MasterDrawerProps {
  isOpen: boolean;
  activeTab: MasterTab;
  currentUser: IStaff;
  isProductFolderOpen: boolean;
  onToggleProductFolder: () => void;
  onClose: () => void;
  onSelectTab: (tab: MasterTab) => void;
  onRequestSupervisorAccess: (targetTab: MasterTab) => void;
}

export const MasterDrawer: React.FC<MasterDrawerProps> = ({
  isOpen,
  activeTab,
  currentUser,
  isProductFolderOpen,
  onToggleProductFolder,
  onClose,
  onSelectTab,
  onRequestSupervisorAccess,
}) => {
  if (!isOpen) return null;

  const handleTabClick = (tab: MasterTab) => {
    onSelectTab(tab);
    onClose();
  };

  const isOwner = currentUser.role === 'owner';

  const handleRestrictedTabClick = (tab: MasterTab) => {
    if (isOwner) {
      handleTabClick(tab);
    } else {
      onClose();
      onRequestSupervisorAccess(tab);
    }
  };

  return (
    <div className="master-drawer-backdrop" onClick={onClose}>
      <aside className="master-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <h3 className="drawer-title">Menu</h3>
          <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup Menu">
            ✕
          </button>
        </div>

        {/* Navigation List */}
        <nav className="drawer-nav">
          {/* Direct Item: Kasir */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => handleTabClick('pos')}
          >
            Kasir / POS
          </button>

          {/* Direct Item: Riwayat Transaksi */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => handleTabClick('transactions')}
          >
            Riwayat Transaksi
          </button>

          {/* Direct Item: Shift */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => handleTabClick('shifts')}
          >
            Shift
          </button>

          {/* Folder Produk & Stok */}
          <div className="nav-folder">
            <button
              type="button"
              className="nav-folder-title"
              onClick={onToggleProductFolder}
            >
              <span>Produk &amp; Stok</span>
              <span>{isProductFolderOpen ? '▼' : '►'}</span>
            </button>

            {isProductFolderOpen && (
              <div className="nav-folder-children">
                <button
                  type="button"
                  className={`nav-child-item ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => handleTabClick('inventory')}
                >
                  └── Bahan &amp; Stok
                </button>
                <button
                  type="button"
                  className={`nav-child-item ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => handleRestrictedTabClick('products')}
                >
                  └── {isOwner ? 'Katalog Menu & Resep' : '🔒 Katalog Menu & Resep'}
                </button>
              </div>
            )}
          </div>

          {/* Laporan Penjualan (Locked for Cashier) */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleRestrictedTabClick('reports')}
          >
            {isOwner ? 'Laporan Penjualan' : '🔒 Laporan Penjualan (Owner)'}
          </button>

          {/* Free for all: Log Aktivitas */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => handleTabClick('logs')}
          >
            Log Aktivitas Sistem
          </button>

          {/* Pengaturan Toko (Accessible to all, internal sensitive items locked) */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabClick('settings')}
          >
            Pengaturan Toko
          </button>
        </nav>
      </aside>
    </div>
  );
};

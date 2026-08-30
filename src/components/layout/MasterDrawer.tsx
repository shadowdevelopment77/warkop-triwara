// ═══════════════════════════════════════════════
// Triwara POS — Master Drawer Navigation (~50% Screen Overlay)
// ═══════════════════════════════════════════════

import React from 'react';
import type { IStaff } from '../../types';

export type MasterTab =
  | 'pos'
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
}

export const MasterDrawer: React.FC<MasterDrawerProps> = ({
  isOpen,
  activeTab,
  currentUser,
  isProductFolderOpen,
  onToggleProductFolder,
  onClose,
  onSelectTab,
}) => {
  if (!isOpen) return null;

  const handleTabClick = (tab: MasterTab) => {
    onSelectTab(tab);
    onClose();
  };

  const isOwner = currentUser.role === 'owner';

  return (
    <div className="master-drawer-backdrop" onClick={onClose}>
      <aside className="master-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <h3 className="drawer-title">Menu Utama</h3>
            <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>
              Halo, {currentUser.name} ({currentUser.role.toUpperCase()})
            </span>
          </div>
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
            🛒 Kasir / POS
          </button>

          {/* Direct Item: Riwayat Shift */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => handleTabClick('shifts')}
          >
            💼 Riwayat Shift Kasir
          </button>

          {/* Owner Only: Folder Produk & Stok (Bahan + Resep HPP) */}
          {isOwner ? (
            <div className="nav-folder">
              <button
                type="button"
                className="nav-folder-title"
                onClick={onToggleProductFolder}
              >
                <span>📦 Produk &amp; Stok</span>
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
                    onClick={() => handleTabClick('products')}
                  >
                    └── Katalog Menu &amp; Resep
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Cashier: Direct Inventory (Check Stock & Restock only) */
            <button
              type="button"
              className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => handleTabClick('inventory')}
            >
              📦 Inventori Bahan &amp; Stok
            </button>
          )}

          {/* Owner Only: Laporan Penjualan */}
          {isOwner && (
            <button
              type="button"
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleTabClick('reports')}
            >
              📊 Laporan Penjualan (Owner)
            </button>
          )}

          {/* Free for all: Log Aktivitas */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => handleTabClick('logs')}
          >
            📋 Log Aktivitas Sistem
          </button>

          {/* Owner Only: Settings */}
          {isOwner && (
            <button
              type="button"
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabClick('settings')}
            >
              ⚙️ Pengaturan Toko
            </button>
          )}
        </nav>
      </aside>
    </div>
  );
};

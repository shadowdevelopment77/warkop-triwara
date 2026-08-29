// ═══════════════════════════════════════════════
// Triwara POS — Master Drawer Navigation (~50% Screen Overlay)
// ═══════════════════════════════════════════════

import React from 'react';

export type MasterTab =
  | 'pos'
  | 'inventory' // Folder Produk & Stok -> Bahan & Stok
  | 'products' // Folder Produk & Stok -> Katalog Menu & Resep
  | 'reports'
  | 'logs'
  | 'settings';

interface MasterDrawerProps {
  isOpen: boolean;
  activeTab: MasterTab;
  isProductFolderOpen: boolean;
  onToggleProductFolder: () => void;
  onClose: () => void;
  onSelectTab: (tab: MasterTab) => void;
}

export const MasterDrawer: React.FC<MasterDrawerProps> = ({
  isOpen,
  activeTab,
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

          {/* Sub-folder Item: Produk & Stok */}
          <div className="nav-folder">
            <button
              type="button"
              className="nav-folder-title"
              onClick={onToggleProductFolder}
            >
              <span>Produk & Stok</span>
              <span>{isProductFolderOpen ? '▼' : '►'}</span>
            </button>

            {isProductFolderOpen && (
              <div className="nav-folder-children">
                <button
                  type="button"
                  className={`nav-child-item ${activeTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => handleTabClick('inventory')}
                >
                  └── Bahan & Stok
                </button>
                <button
                  type="button"
                  className={`nav-child-item ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => handleTabClick('products')}
                >
                  └── Katalog Menu & Resep
                </button>
              </div>
            )}
          </div>

          {/* Direct Item: Laporan */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleTabClick('reports')}
          >
            Laporan Penjualan
          </button>

          {/* Direct Item: Log Aktivitas */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => handleTabClick('logs')}
          >
            Log Aktivitas
          </button>

          {/* Direct Item: Settings */}
          <button
            type="button"
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabClick('settings')}
          >
            Pengaturan Aplikasi
          </button>
        </nav>
      </aside>
    </div>
  );
};

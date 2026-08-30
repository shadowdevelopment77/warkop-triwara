// ═══════════════════════════════════════════════
// Triwara POS — Main Top Header Bar
// ═══════════════════════════════════════════════

import React from 'react';

interface HeaderProps {
  appName: string;
  appLogo?: string;
  unreadCount?: number;
  isNotificationOpen?: boolean;
  currentUserName?: string;
  onOpenMaster: () => void;
  onToggleNotifications: () => void;
  onLockApp: () => void;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  appName,
  appLogo,
  unreadCount = 0,
  isNotificationOpen = false,
  currentUserName,
  onOpenMaster,
  onToggleNotifications,
  onLockApp,
  children,
}) => {
  return (
    <header className="app-header">
      {/* Master Hamburger Button on FAR-LEFT */}
      <div className="header-left-actions">
        <button
          type="button"
          className="btn-hamburger-trigger"
          onClick={onOpenMaster}
          title="Buka Menu Master"
          aria-label="Menu Master"
        >
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>

        {/* App Branding */}
        <div className="header-brand">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="header-logo" />
          ) : (
            <span className="header-avatar">TP</span>
          )}
          <h1 className="header-title">{appName || 'Triwara POS'}</h1>
        </div>
      </div>

      {/* Right Actions: Greeting + Notification Bell + Lock App + Flyout */}
      <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {currentUserName && (
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
            }}
          >
            Halo, {currentUserName}
          </span>
        )}

        <button
          type="button"
          className={`btn-notification-trigger ${isNotificationOpen ? 'active' : ''}`}
          onClick={onToggleNotifications}
          title="Notifikasi Sistem (24 Jam) - Klik untuk Buka / Tutup"
          aria-label="Notifikasi"
        >
          <span>🔔</span>
          {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>

        <button type="button" className="btn-lock-trigger" onClick={onLockApp} title="Kunci Aplikasi">
          Kunci PIN
        </button>

        {children}
      </div>
    </header>
  );
};


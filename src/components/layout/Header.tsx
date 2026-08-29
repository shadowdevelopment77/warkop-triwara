// ═══════════════════════════════════════════════
// Triwara POS — Main Top Header Bar
// ═══════════════════════════════════════════════

import React from 'react';

interface HeaderProps {
  appName: string;
  appLogo?: string;
  onOpenMaster: () => void;
  onLockApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ appName, appLogo, onOpenMaster, onLockApp }) => {
  return (
    <header className="app-header">
      {/* Master Button on FAR-LEFT */}
      <button type="button" className="btn-master-trigger" onClick={onOpenMaster}>
        [Master]
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

      {/* Lock App Action */}
      <button type="button" className="btn-lock-trigger" onClick={onLockApp} title="Kunci Aplikasi">
        Kunci PIN
      </button>
    </header>
  );
};

// ═══════════════════════════════════════════════
// Triwara POS — Main Application Entry Point
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { PinLock } from './components/auth/PinLock';
import { AppShell } from './components/layout/AppShell';
import { configService } from './services/config.service';
import { seedDatabaseIfEmpty } from './database/seed';
import type { IShopConfig, IStaff } from './types';
import './styles/global.css';
import './styles/layout.css';
import './styles/pos.css';
import './styles/menu.css';
import './styles/inventory.css';
import './styles/report.css';
import './styles/settings.css';
import './styles/logs.css';
import './styles/auth.css';
import './styles/dialog.css';
import './styles/shifts.css';

export function App() {
  const [currentUser, setCurrentUser] = useState<IStaff | null>(null);
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);

  useEffect(() => {
    seedDatabaseIfEmpty().finally(() => {
      configService.getConfig().then(setShopConfig).catch(console.error);
    });
  }, [currentUser]);

  return (
    <div className="triwara-pos-app">
      {!currentUser ? (
        <PinLock
          appName={shopConfig?.appName || 'Triwara POS'}
          appLogo={shopConfig?.appLogoBase64}
          onUnlocked={(staff) => setCurrentUser(staff)}
        />
      ) : (
        <AppShell currentUser={currentUser} onLockApp={() => setCurrentUser(null)} />
      )}
    </div>
  );
}

export default App;

// ═══════════════════════════════════════════════
// Triwara POS — Main Application Entry Point
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { PinLock } from './components/auth/PinLock';
import { AppShell } from './components/layout/AppShell';
import { configService } from './services/config.service';
import { seedDatabaseIfEmpty } from './database/seed';
import type { IShopConfig } from './types';
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

export function App() {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);

  useEffect(() => {
    seedDatabaseIfEmpty().finally(() => {
      configService.getConfig().then(setShopConfig).catch(console.error);
    });
  }, [isLocked]);

  return (
    <div className="triwara-pos-app">
      {isLocked ? (
        <PinLock
          appName={shopConfig?.appName || 'Triwara POS'}
          appLogo={shopConfig?.appLogoBase64}
          onUnlocked={() => setIsLocked(false)}
        />
      ) : (
        <AppShell onLockApp={() => setIsLocked(true)} />
      )}
    </div>
  );
}

export default App;

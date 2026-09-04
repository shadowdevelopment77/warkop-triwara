// ═══════════════════════════════════════════════
// Triwara POS — Main Application Entry Point
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { PinLock } from './components/auth/PinLock';
import { LockdownScreen } from './components/auth/LockdownScreen';
import { AppShell } from './components/layout/AppShell';
import { configService } from './services/config.service';
import { licenseService, type ILicenseInfo } from './services/license.service';
import { reportService } from './services/report.service';
import { initializeProductionDatabaseIfNeeded } from './database/seed';
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
  const [licenseInfo, setLicenseInfo] = useState<ILicenseInfo>(() => licenseService.getLicenseInfo());
  const [exitToastVisible, setExitToastVisible] = useState<boolean>(false);

  useEffect(() => {
    return licenseService.subscribe((info) => setLicenseInfo(info));
  }, []);

  useEffect(() => {
    initializeProductionDatabaseIfNeeded().finally(() => {
      configService.getConfig().then(setShopConfig).catch(console.error);
      reportService.healRecentDailySummary();
    });
  }, [currentUser]);

  // Hardware Back Button Handler (Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPressTime = 0;
    let toastTimer: any = null;

    const backListenerPromise = CapApp.addListener('backButton', () => {
      // 1. If soft keyboard or active input is focused -> blur to dismiss keyboard
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)
      ) {
        (activeEl as HTMLElement).blur();
        return;
      }

      // 2. If any modal / popup dialog is open -> trigger top-most close button
      const closeBtns = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.modal-backdrop .modal-close-btn-red, .modal-backdrop .report-void-btn-cancel, .modal-backdrop .inv-btn-secondary, .modal-backdrop .menu-btn-secondary, .modal-backdrop button.btn-secondary, .dialog-backdrop button.dialog-btn-secondary, .dialog-backdrop button.dialog-btn-primary'
        )
      );
      if (closeBtns.length > 0) {
        const topBtn = closeBtns[closeBtns.length - 1];
        topBtn.click();
        return;
      }

      // 3. If navigation sidebar drawer is open -> close drawer
      const drawerBackdrop = document.querySelector<HTMLElement>('.drawer-backdrop');
      if (drawerBackdrop) {
        drawerBackdrop.click();
        return;
      }

      // 4. Double-tap back within 2 seconds to exit application safely
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressTime = now;
        setExitToastVisible(true);
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          setExitToastVisible(false);
        }, 2000);
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  if (licenseInfo.isLocked) {
    return (
      <LockdownScreen
        licenseInfo={licenseInfo}
        appName={shopConfig?.appName}
        appLogo={shopConfig?.appLogoBase64}
      />
    );
  }

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

      {exitToastVisible && (
        <div className="pos-exit-toast">
          Tekan sekali lagi untuk keluar dari aplikasi
        </div>
      )}
    </div>
  );
}

export default App;

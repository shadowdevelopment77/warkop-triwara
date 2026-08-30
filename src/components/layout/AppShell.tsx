// ═══════════════════════════════════════════════
// Triwara POS — Main Application Shell Wrapper
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type {
  IProduct,
  ICategory,
  ICartItem,
  IShopConfig,
  PaymentMethod,
  IOrder,
} from '../../types';

import { Header } from './Header';
import { MasterDrawer, type MasterTab } from './MasterDrawer';
import { NotificationFlyout } from './NotificationFlyout';
import { SearchBar } from '../pos/SearchBar';
import { CategoryFilter } from '../pos/CategoryFilter';
import { MenuSidebar } from '../pos/MenuSidebar';
import { VariantModal } from '../pos/VariantModal';
import { CartPanel } from '../pos/CartPanel';
import { PaymentModal } from '../pos/PaymentModal';
import { PrintSelectModal } from '../pos/PrintSelectModal';

import { InventoryPanel } from '../master/InventoryPanel';
import { MenuPanel } from '../master/MenuPanel';
import { ReportPanel } from '../master/ReportPanel';
import { SettingsPanel } from '../master/SettingsPanel';
import { LogPanel } from '../master/LogPanel';

import { productService } from '../../services/product.service';
import { configService } from '../../services/config.service';
import { orderService } from '../../services/order.service';
import { receiptService, type ReceiptType } from '../../services/receipt.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import type { IAppNotification, IStaff, IShift } from '../../types';
import { DialogModal } from '../common/DialogModal';
import { shiftService } from '../../services/shift.service';
import { OpenShiftModal } from '../master/OpenShiftModal';
import { CloseShiftModal } from '../master/CloseShiftModal';
import { ShiftHistoryPanel } from '../master/ShiftHistoryPanel';
import { TransactionHistoryPanel } from '../master/TransactionHistoryPanel';
import { SupervisorPinModal } from '../auth/SupervisorPinModal';
import { PostCloseStoreModal } from '../master/PostCloseStoreModal';

interface AppShellProps {
  currentUser: IStaff;
  onLockApp: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ currentUser, onLockApp }) => {
  // Navigation & Drawer
  const [activeTab, setActiveTab] = useState<MasterTab>('pos');
  const [isMasterOpen, setIsMasterOpen] = useState<boolean>(false);
  const [isProductFolderOpen, setIsProductFolderOpen] = useState<boolean>(false);

  // Shift & Store State
  const [activeShift, setActiveShift] = useState<IShift | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState<boolean>(false);
  const [justClosedShift, setJustClosedShift] = useState<IShift | null>(null);

  // Supervisor PIN Modal
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState<boolean>(false);
  const [supervisorCallback, setSupervisorCallback] = useState<(() => void) | null>(null);
  const [supervisorTitle, setSupervisorTitle] = useState<string>('');
  const [supervisorMessage, setSupervisorMessage] = useState<string>('');

  const handleRequestSupervisorAccess = (
    targetTabOrAction: MasterTab | (() => void),
    title?: string,
    msg?: string
  ) => {
    if (typeof targetTabOrAction === 'string') {
      const tabName = targetTabOrAction === 'reports' ? 'Laporan Penjualan' : 'Katalog Menu & Resep';
      setSupervisorTitle(`🔒 Akses ${tabName}`);
      setSupervisorMessage(
        `Menu "${tabName}" memerlukan otorisasi Owner. Masukkan 4 digit PIN Owner untuk melanjutkan.`
      );
      setSupervisorCallback(() => () => setActiveTab(targetTabOrAction));
    } else {
      setSupervisorTitle(title || '🔒 Otorisasi Supervisor / Owner');
      setSupervisorMessage(
        msg || 'Fitur ini memerlukan otorisasi Owner. Masukkan 4 digit PIN Owner untuk melanjutkan.'
      );
      setSupervisorCallback(() => targetTabOrAction);
    }
    setIsSupervisorModalOpen(true);
  };

  const loadActiveShift = useCallback(async () => {
    try {
      const shift = await shiftService.getActiveShift();
      setActiveShift(shift);
    } catch (err) {
      console.error('Failed to load active shift:', err);
    }
  }, []);

  useEffect(() => {
    loadActiveShift();
  }, [loadActiveShift]);

  // Dialog Modal state
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title: string;
    message: string;
    isDanger?: boolean;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Notifications State (Dropdown Flyout)
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<IAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Shop Config
  const [shopConfig, setShopConfig] = useState<IShopConfig | null>(null);

  // POS State
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cart & Modals
  const [cartItems, setCartItems] = useState<ICartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  const [customizingProduct, setCustomizingProduct] = useState<IProduct | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<IOrder | null>(null);

  const refreshNotifications = useCallback(async () => {
    try {
      const active = await notificationService.getActiveNotifications();
      setNotifications(active);
      setUnreadCount(active.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const loadPosData = useCallback(async () => {
    try {
      const cfg = await configService.getConfig();
      const cats = await productService.getCategories();
      const prods = await productService.getProducts(selectedCategoryId || undefined, searchTerm);

      setShopConfig(cfg);
      setCategories(cats);
      setProducts(prods);
      refreshNotifications();
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  }, [selectedCategoryId, searchTerm, refreshNotifications]);

  useEffect(() => {
    loadPosData();
  }, [loadPosData]);

  // Subscribe to real-time notification events
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      refreshNotifications();
    });
    return unsubscribe;
  }, [refreshNotifications]);

  // Auto-close drawers, notifications, and reset folder expansion on tab switch
  useEffect(() => {
    setIsNotificationOpen(false);
    setIsMasterOpen(false);
    setIsProductFolderOpen(false);
  }, [activeTab]);

  // Cart Operations
  const handleAddToCart = (item: ICartItem) => {
    // If identical variant exists, increment qty
    const existingIndex = cartItems.findIndex(
      (c) =>
        c.product.id === item.product.id &&
        c.orderType === item.orderType &&
        c.temperature === item.temperature &&
        c.sugarLevel === item.sugarLevel &&
        c.notes === item.notes &&
        c.extraToppings.length === item.extraToppings.length &&
        c.extraToppings.every((t) => item.extraToppings.some((it) => it.name === t.name))
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += item.quantity;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, item]);
    }
  };

  const handleUpdateCartQty = (cartId: string, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.cartId === cartId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((item): item is ICartItem => item !== null);

    setCartItems(updated);
  };

  const handleRemoveCartItem = (cartId: string) => {
    setCartItems(cartItems.filter((i) => i.cartId !== cartId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscountPercent(0);
  };

  // Checkout & Payment
  const handleConfirmPayment = async (
    customerName: string,
    paymentMethod: PaymentMethod,
    paymentAmount: number
  ) => {
    if (!activeShift) {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: 'Shift Kasir Belum Dibuka',
        message: 'Shift kasir belum dibuka. Buka shift kasir sekarang agar transaksi tercatat ke laci uang petugas?',
        confirmText: 'Buka Shift',
        onConfirm: () => {
          setIsOpenShiftModalOpen(true);
        },
      });
      return;
    }

    try {
      const { order, lowStockAlerts } = await orderService.createOrder(
        cartItems,
        customerName,
        discountPercent,
        paymentMethod,
        paymentAmount,
        currentUser.name
      );
      loadActiveShift();

      // Record 24h notification
      await notificationService.addNotification(
        'Transaksi Berhasil',
        `Pesanan #${order.orderNumber} (${customerName || 'Umum'}) senilai ${formatRupiah(order.total)} sukses diproses.`,
        'order',
        'reports'
      );

      if (lowStockAlerts.length > 0) {
        await notificationService.addNotification(
          'Peringatan Stok Rendah',
          lowStockAlerts.join(', '),
          'alert',
          'inventory'
        );
      }

      setCartItems([]);
      setDiscountPercent(0);
      setIsPaymentModalOpen(false);
      setCompletedOrder(order);
      refreshNotifications();

      if (lowStockAlerts.length > 0) {
        setDialogConfig({
          isOpen: true,
          title: 'Peringatan Stok Menipis',
          message: lowStockAlerts.join('\n'),
        });
      }
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        title: 'Pembayaran Gagal',
        message: 'Gagal memproses pembayaran: ' + (err as Error).message,
      });
    }
  };

  const handleConfirmPrint = async (selectedTypes: ReceiptType[]) => {
    if (!completedOrder || !shopConfig) return;
    try {
      for (const type of selectedTypes) {
        const text = receiptService.generateReceiptText(completedOrder, shopConfig, type);
        console.log(`[PRINTING ${type.toUpperCase()}]\n` + text);
      }
      setDialogConfig({
        isOpen: true,
        title: 'Pencetakan Terkirim',
        message: `Struk (${selectedTypes.join(', ')}) berhasil dikirim ke printer.`,
      });
    } catch (err) {
      setDialogConfig({
        isOpen: true,
        title: 'Gagal Cetak Struk',
        message: 'Gagal mencetak struk: ' + (err as Error).message,
      });
    }
  };

  const handleSelectNotification = async (targetTab?: MasterTab, notifId?: number) => {
    if (notifId) {
      await notificationService.markAsRead(notifId);
    }
    if (targetTab) {
      if (currentUser.role !== 'owner' && (targetTab === 'reports' || targetTab === 'products')) {
        handleRequestSupervisorAccess(targetTab);
      } else {
        setActiveTab(targetTab);
      }
    }
    setIsNotificationOpen(false);
    refreshNotifications();
  };

  const handleMarkAllNotificationsRead = async () => {
    await notificationService.markAllAsRead();
    refreshNotifications();
  };

  const handleQuickAddToCart = (product: IProduct) => {
    handleAddToCart({
      cartId: `${product.id}-${Date.now()}`,
      product,
      quantity: 1,
      orderType: 'dine_in',
      temperature: 'Iced',
      sugarLevel: 'Normal (100%)',
      extraToppings: [],
      notes: '',
      itemPrice: product.price,
      itemHpp: 0,
    });
  };

  return (
    <div className="app-shell-root">
      {/* Top Header with Notification Flyout */}
      <Header
        appName={shopConfig?.appName || 'Triwara POS'}
        appLogo={shopConfig?.appLogoBase64}
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
        currentUserName={currentUser.name}
        onOpenMaster={() => setIsMasterOpen(true)}
        onToggleNotifications={() => setIsNotificationOpen((prev) => !prev)}
        onLockApp={onLockApp}
      >
        <NotificationFlyout
          isOpen={isNotificationOpen}
          notifications={notifications}
          onClose={() => setIsNotificationOpen(false)}
          onSelectNotification={handleSelectNotification}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />
      </Header>

      {/* Master Navigation Drawer Overlay with persistent folder state */}
      <MasterDrawer
        isOpen={isMasterOpen}
        activeTab={activeTab}
        currentUser={currentUser}
        isProductFolderOpen={isProductFolderOpen}
        onToggleProductFolder={() => setIsProductFolderOpen((prev) => !prev)}
        onClose={() => setIsMasterOpen(false)}
        onRequestSupervisorAccess={(tab) => handleRequestSupervisorAccess(tab)}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          loadPosData();
        }}
      />

      {/* Main Screen Content */}
      <main className="app-content-body">
        {activeTab === 'pos' && (
          <div className="pos-view-split">
            {/* Left Column: Search + Horizontal Category Filter + Vertical Menu Sidebar */}
            <div className="pos-left-column">
              {/* POS Active Shift Action Banner */}
              <div
                className={`shift-pos-banner ${activeShift ? 'active' : 'closed'}`}
                style={{ marginBottom: '8px' }}
              >
                {activeShift ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span><strong>Toko Buka: Shift #{activeShift.shiftNumber}</strong> ({activeShift.cashierName})</span>
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                      Kas Awal: {formatRupiah(activeShift.startingCash)} | Tunai: {formatRupiah(activeShift.totalCashSales)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span><strong>Toko Sedang Tutup</strong></span>
                  </div>
                )}

                <div>
                  {!activeShift ? (
                    <button
                      type="button"
                      className="shift-btn-open"
                      style={{ height: '30px', fontSize: '12px', padding: '0 12px' }}
                      onClick={() => setIsOpenShiftModalOpen(true)}
                    >
                      Buka Toko
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="shift-btn-danger"
                      style={{ height: '30px', fontSize: '12px', padding: '0 12px' }}
                      onClick={() => setIsCloseShiftModalOpen(true)}
                    >
                      Tutup Toko
                    </button>
                  )}
                </div>
              </div>

              <SearchBar value={searchTerm} onChange={setSearchTerm} />

              <CategoryFilter
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />

              <MenuSidebar
                products={products}
                onQuickAddToCart={handleQuickAddToCart}
                onOpenVariant={(product) => setCustomizingProduct(product)}
              />

              {/* Mobile Floating Cart Action Bar (Phones / Narrow Screens) */}
              {cartItems.length > 0 && (
                <div className="mobile-floating-cart-bar">
                  <button
                    type="button"
                    className="mobile-floating-cart-btn"
                    onClick={() => setIsMobileCartOpen(true)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="mobile-floating-cart-badge">
                        {cartItems.reduce((acc, it) => acc + it.quantity, 0)}
                      </span>
                      <span>
                        {formatRupiah(
                          cartItems.reduce((acc, it) => acc + it.itemPrice * it.quantity, 0)
                        )}
                      </span>
                    </div>
                    <span>Lihat Pesanan ➔</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Persistent Cart Panel */}
            <CartPanel
              cartItems={cartItems}
              discountPercent={discountPercent}
              onUpdateQty={handleUpdateCartQty}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onChangeDiscount={setDiscountPercent}
              isMobileOpen={isMobileCartOpen}
              onCloseMobile={() => setIsMobileCartOpen(false)}
              onProceedToPayment={() => {
                if (!activeShift) {
                  setDialogConfig({
                    isOpen: true,
                    type: 'alert',
                    title: 'Toko Belum Dibuka',
                    message:
                      'Anda harus membuka toko terlebih dahulu dengan memasukkan kas awal modal kembalian sebelum dapat memproses transaksi penjualan.',
                    confirmText: 'Buka Toko Sekarang',
                    onConfirm: () => {
                      setDialogConfig((prev) => ({ ...prev, isOpen: false }));
                      setIsOpenShiftModalOpen(true);
                    },
                  });
                  return;
                }
                setIsPaymentModalOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <TransactionHistoryPanel
            onReprintOrder={(order) => setCompletedOrder(order)}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftHistoryPanel
            onOpenNewShift={() => setIsOpenShiftModalOpen(true)}
          />
        )}

        {activeTab === 'inventory' && <InventoryPanel />}
        {activeTab === 'products' && <MenuPanel />}
        {activeTab === 'reports' && <ReportPanel />}
        {activeTab === 'logs' && <LogPanel />}
        {activeTab === 'settings' && (
          <SettingsPanel
            currentUser={currentUser}
            onRequestSupervisorAccess={(cb) => handleRequestSupervisorAccess(cb)}
          />
        )}
      </main>

      {/* Variant Modal */}
      {customizingProduct && (
        <VariantModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          totalAmount={
            cartItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0) *
            ((100 - discountPercent) / 100)
          }
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Manual Print Selection Modal */}
      {completedOrder && (
        <PrintSelectModal
          order={completedOrder}
          shopConfig={shopConfig}
          onClose={() => setCompletedOrder(null)}
          onConfirmPrint={handleConfirmPrint}
        />
      )}

      {/* Open Store Modal */}
      {isOpenShiftModalOpen && (
        <OpenShiftModal
          isOpen={isOpenShiftModalOpen}
          staff={currentUser}
          onClose={() => setIsOpenShiftModalOpen(false)}
          onOpened={(newShift) => {
            setActiveShift(newShift);
            setIsOpenShiftModalOpen(false);
          }}
        />
      )}

      {/* Close Store Modal */}
      {isCloseShiftModalOpen && activeShift && (
        <CloseShiftModal
          isOpen={isCloseShiftModalOpen}
          shift={activeShift}
          onClose={() => setIsCloseShiftModalOpen(false)}
          onClosed={(closedShift) => {
            setActiveShift(null);
            setIsCloseShiftModalOpen(false);
            setJustClosedShift(closedShift);
            loadActiveShift();
          }}
        />
      )}

      {/* Post Close Store Modal (Thermal Receipt Preview & PDF) */}
      {justClosedShift && (
        <PostCloseStoreModal
          isOpen={!!justClosedShift}
          shift={justClosedShift}
          shopConfig={shopConfig}
          onFinish={() => setJustClosedShift(null)}
        />
      )}

      {/* Supervisor PIN Modal */}
      <SupervisorPinModal
        isOpen={isSupervisorModalOpen}
        title={supervisorTitle}
        message={supervisorMessage}
        onClose={() => {
          setIsSupervisorModalOpen(false);
          setSupervisorCallback(null);
        }}
        onSuccess={() => {
          if (supervisorCallback) {
            supervisorCallback();
          }
        }}
      />

      {/* Reusable Dialog Modal for Alerts & Confirmations */}
      <DialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type || 'alert'}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        isDanger={dialogConfig.isDanger}
        onConfirm={dialogConfig.onConfirm || (() => setDialogConfig((prev) => ({ ...prev, isOpen: false })))}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

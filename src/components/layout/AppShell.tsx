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
import type { IAppNotification } from '../../types';

interface AppShellProps {
  onLockApp: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ onLockApp }) => {
  // Navigation & Drawer
  const [activeTab, setActiveTab] = useState<MasterTab>('pos');
  const [isMasterOpen, setIsMasterOpen] = useState<boolean>(false);
  const [isProductFolderOpen, setIsProductFolderOpen] = useState<boolean>(false);

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
    try {
      const { order, lowStockAlerts } = await orderService.createOrder(
        cartItems,
        customerName,
        discountPercent,
        paymentMethod,
        paymentAmount
      );

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
        alert(lowStockAlerts.join('\n'));
      }
    } catch (err) {
      alert('Gagal memproses pembayaran: ' + (err as Error).message);
    }
  };

  const handleConfirmPrint = async (selectedTypes: ReceiptType[]) => {
    if (!completedOrder || !shopConfig) return;
    try {
      for (const type of selectedTypes) {
        const text = receiptService.generateReceiptText(completedOrder, shopConfig, type);
        console.log(`[PRINTING ${type.toUpperCase()}]\n` + text);
      }
      alert(`Struk (${selectedTypes.join(', ')}) berhasil dikirim ke printer.`);
    } catch (err) {
      alert('Gagal mencetak struk: ' + (err as Error).message);
    }
  };

  const handleSelectNotification = async (targetTab?: MasterTab, notifId?: number) => {
    if (notifId) {
      await notificationService.markAsRead(notifId);
    }
    if (targetTab) {
      setActiveTab(targetTab);
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
      {/* Mobile Portrait Warning Overlay */}
      <div className="portrait-warning-overlay">
        <div className="portrait-warning-content">
          <span className="portrait-warning-icon">📱 ➔ 📲</span>
          <h3 style={{ color: '#fafafa', fontSize: '18px', fontWeight: 800 }}>Mode Landscape Diperlukan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
            Triwara POS dioptimalkan untuk Tablet (Advan Tab 10) atau posisi layar mendatar (Landscape) demi kenyamanan kasir.
          </p>
        </div>
      </div>

      {/* Top Header with Notification Flyout */}
      <Header
        appName={shopConfig?.appName || 'Triwara POS'}
        appLogo={shopConfig?.appLogoBase64}
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
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
        isProductFolderOpen={isProductFolderOpen}
        onToggleProductFolder={() => setIsProductFolderOpen((prev) => !prev)}
        onClose={() => setIsMasterOpen(false)}
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
            </div>

            {/* Right Column: Persistent Cart Panel */}
            <CartPanel
              cartItems={cartItems}
              discountPercent={discountPercent}
              onUpdateQty={handleUpdateCartQty}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onChangeDiscount={setDiscountPercent}
              onProceedToPayment={() => setIsPaymentModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'inventory' && <InventoryPanel />}
        {activeTab === 'products' && <MenuPanel />}
        {activeTab === 'reports' && <ReportPanel />}
        {activeTab === 'logs' && <LogPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
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
    </div>
  );
};


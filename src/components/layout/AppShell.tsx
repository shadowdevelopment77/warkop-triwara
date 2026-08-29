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

interface AppShellProps {
  onLockApp: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ onLockApp }) => {
  // Navigation & Drawer
  const [activeTab, setActiveTab] = useState<MasterTab>('pos');
  const [isMasterOpen, setIsMasterOpen] = useState<boolean>(false);

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

  const loadPosData = useCallback(async () => {
    try {
      const cfg = await configService.getConfig();
      const cats = await productService.getCategories();
      const prods = await productService.getProducts(selectedCategoryId || undefined, searchTerm);

      setShopConfig(cfg);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  }, [selectedCategoryId, searchTerm]);

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

      setCartItems([]);
      setDiscountPercent(0);
      setIsPaymentModalOpen(false);
      setCompletedOrder(order);

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

  return (
    <div className="app-shell-root">
      {/* Top Header */}
      <Header
        appName={shopConfig?.appName || 'Triwara POS'}
        appLogo={shopConfig?.appLogoBase64}
        onOpenMaster={() => setIsMasterOpen(true)}
        onLockApp={onLockApp}
      />

      {/* Master Navigation Drawer Overlay */}
      <MasterDrawer
        isOpen={isMasterOpen}
        activeTab={activeTab}
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
                onSelectProduct={(product) => setCustomizingProduct(product)}
              />
            </div>

            {/* Right Column: Persistent Cart Panel */}
            <div className="pos-right-column">
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
          orderNumber={completedOrder.orderNumber}
          onClose={() => setCompletedOrder(null)}
          onConfirmPrint={handleConfirmPrint}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// Triwara POS — Shared TypeScript Interfaces & Types
// ═══════════════════════════════════════════════

export type IngredientCategory = 'raw' | 'packaging' | string;
export type UnitType = 'gr' | 'ml' | 'pcs';
export type OrderType = 'dine_in' | 'takeaway';
export type PaymentMethod = 'cash' | 'qris';
export type TransactionStatus = 'completed' | 'voided';
export type TemperatureOption = 'Hot' | 'Iced';
export type LogType = 'void' | 'restock' | 'menu' | 'inventory' | 'shift';

export interface IIngredient {
  id?: number;
  name: string;
  category: IngredientCategory;
  unit: UnitType;
  costPerUnit: number; // Auto: purchasePrice / purchaseQuantity
  currentStock: number;
  minStock: number;
  purchasePackageName: string;
  purchasePrice: number;
  purchaseQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecipeItem {
  ingredientId: number;
  amount: number;
  unit: UnitType;
}

export interface ICategory {
  id?: number;
  name: string;
  sortOrder: number;
}

export interface IProductAdditional {
  name: string;
  price: number;
  ingredientId?: number;
  amount?: number;
}

export interface IProduct {
  id?: number;
  categoryId: number;
  name: string;
  price: number;
  description: string;
  recipe: IRecipeItem[];
  takeawayPackaging: IRecipeItem[];
  availableAdditionals?: IProductAdditional[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItemTopping {
  name: string;
  price: number;
  hppCost: number;
  ingredientId?: number;
  amount?: number;
}

export interface IOrderItem {
  productId: number;
  productName: string;
  price: number;
  hpp: number; // Snapshot HPP per unit
  qty: number;
  orderType: OrderType;
  subtotal: number;
  hppSubtotal: number; // Snapshot HPP × Qty
  toppings: IOrderItemTopping[];
  notes: string;
}

export interface IOrder {
  id?: number;
  orderNumber: string; // e.g. TRW-20260829-001
  sequenceNumber: number; // 1, 2, 3... per day
  customerName: string;
  items: IOrderItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  hppTotal: number; // Snapshot total HPP
  profit: number; // Snapshot Total - TotalHPP
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  changeAmount: number;
  status: TransactionStatus;
  voidedAt?: Date;
  voidReason?: string;
  shiftId?: number; // Linked active shift
  processedBy?: string; // Cashier / staff name
  createdAt: Date;
}

export interface IStaff {
  id?: number;
  name: string;
  pin: string; // 4-digit numeric string (e.g. '0000', '1234')
  role: 'owner' | 'cashier';
  active: boolean;
  createdAt: Date;
}

export interface IShift {
  id?: number;
  shiftNumber: string; // e.g. SHF-20260830-001
  cashierId: number;
  cashierName: string;
  openedAt: Date;
  closedAt?: Date;
  startingCash: number; // Kas awal modal kembalian
  totalCashSales: number; // Penjualan tunai
  totalQrisSales: number; // Penjualan QRIS
  totalTransactions: number; // Jumlah order
  totalVoided: number; // Jumlah void
  expectedEndingCash?: number; // startingCash + totalCashSales
  actualEndingCash?: number; // Dihitung fisik oleh kasir
  cashDifference?: number; // actualEndingCash - expectedEndingCash
  notes?: string;
  status: 'open' | 'closed';
}

export interface IInventoryLog {
  id?: number;
  ingredientId: number;
  ingredientName: string;
  type: 'sale' | 'restock' | 'void_return' | 'adjustment';
  quantity: number; // positive = added, negative = deducted
  note: string;
  referenceOrderNumber?: string;
  createdAt: Date;
}

export interface ILog {
  id?: number;
  type: LogType;
  description: string;
  referenceId?: string;
  createdAt: Date;
}

export interface IShopConfig {
  id?: number;
  appName: string;
  appLogoBase64?: string;
  receiptLogoBase64?: string;
  receiptHeaderLines: string[]; // max 3 lines
  receiptFooterLines: string[]; // max 4 lines (includes WiFi + Password)
  pinHash: string; // SHA-256
  printerMacAddress?: string;
  printerName?: string;
  customIngredientCategories?: string[];
}

export interface ICartItem {
  cartId: string;
  product: IProduct;
  quantity: number;
  orderType: OrderType;
  temperature: TemperatureOption;
  sugarLevel: string;
  extraToppings: {
    name: string;
    price: number;
    ingredientId?: number;
    amount?: number;
  }[];
  notes: string;
  itemPrice: number;
  itemHpp: number;
}

export type NotificationType = 'inventory' | 'order' | 'product' | 'alert';

export interface IAppNotification {
  id?: number;
  title: string;
  message: string;
  type: NotificationType;
  targetTab?: 'pos' | 'inventory' | 'products' | 'reports';
  createdAt: Date;
  isRead: boolean;
}


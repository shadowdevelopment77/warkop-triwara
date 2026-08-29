// ═══════════════════════════════════════════════
// Triwara POS — Shared TypeScript Interfaces & Types
// ═══════════════════════════════════════════════

export type IngredientCategory = 'raw' | 'packaging';
export type UnitType = 'gr' | 'ml' | 'pcs';
export type OrderType = 'dine_in' | 'takeaway';
export type PaymentMethod = 'cash' | 'qris';
export type TransactionStatus = 'completed' | 'voided';
export type TemperatureOption = 'Hot' | 'Iced';
export type LogType = 'void' | 'restock';

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

export interface IProduct {
  id?: number;
  categoryId: number;
  name: string;
  codeBadge: string; // 2-letter badge e.g. "AC", "CL"
  price: number;
  description: string;
  recipe: IRecipeItem[];
  takeawayPackaging: IRecipeItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItemTopping {
  name: string;
  price: number;
  hppCost: number;
}

export interface IOrderItem {
  productId: number;
  productName: string;
  codeBadge: string;
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
  createdAt: Date;
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

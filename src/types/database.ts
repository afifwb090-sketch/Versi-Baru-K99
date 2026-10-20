/**
 * Database and Domain Models for K99 POS System - Kopi 99 Warungboto
 * Matches PostgreSQL schema in Supabase
 */

export type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory_staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  id: string;
  business_name: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  whatsapp_number: string; // Used for WhatsApp Click-to-chat checkout
  opening_hours: string;
  timezone: string;
  currency: string;
  tax_enabled: boolean;
  tax_percentage: number;
  service_charge_percentage: number;
  receipt_header: string;
  receipt_footer: string;
  order_prefix_offline: string;
  order_prefix_online: string;
  low_stock_threshold_default: number;
  online_ordering_active: boolean;
  is_store_open: boolean; // Flag to indicate whether the shop is currently open or closed
  store_closed_message?: string;
  delivery_available: boolean;
  pickup_available: boolean;
  instagram_url?: string;
  google_maps_url?: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // e.g., 'Regular / 12oz', 'Large / 16oz', 'Hot', 'Iced'
  sku: string;
  price_offline: number;
  price_online: number;
  estimated_hpp: number;
  is_active: boolean;
}

export interface ProductAddon {
  id: string;
  product_id?: string; // Optional: specific to product or global
  name: string; // e.g., 'Extra Espresso Shot', 'Gula Aren Ekstra', 'Jelly Grass', 'Oatmilk'
  price: number;
  estimated_hpp: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category_id: string;
  category_name?: string;
  image_url: string;
  price_offline: number;
  price_online: number;
  estimated_hpp: number;
  is_active: boolean;
  is_online_available: boolean;
  is_offline_available: boolean;
  preparation_time_minutes: number;
  sort_order: number;
  variants: ProductVariant[];
  addons: ProductAddon[];
  has_recipe: boolean;
  created_at: string;
  updated_at: string;
}

export type IngredientUnit = 'gram' | 'kg' | 'ml' | 'liter' | 'pcs' | 'bottle' | 'pack';

export interface Ingredient {
  id: string;
  sku: string;
  name: string;
  category: 'coffee' | 'dairy' | 'syrup' | 'powder' | 'tea' | 'packaging' | 'other';
  purchase_quantity: number;
  purchase_price: number;
  base_unit: IngredientUnit;
  cost_per_base_unit: number; // e.g., Rp/gram or Rp/ml
  current_stock: number;
  minimum_stock: number;
  supplier_id?: string;
  supplier_name?: string;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit: IngredientUnit;
  unit_cost: number;
  subtotal_cost: number;
  is_packaging?: boolean;
}

export interface Recipe {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name?: string;
  notes?: string;
  items: RecipeItem[];
  total_ingredient_cost: number;
  total_packaging_cost: number;
  total_hpp: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  total_orders_count: number;
  balance_payable: number;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: IngredientUnit;
  unit_price: number;
  subtotal: number;
  expiration_date?: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  due_date?: string;
  status: 'ordered' | 'received' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  notes?: string;
  received_at?: string;
  received_by?: string;
  items: PurchaseItem[];
  created_at: string;
}

export type InventoryMovementType =
  | 'sale'
  | 'purchase_receive'
  | 'spoilage_waste'
  | 'stock_opname'
  | 'adjustment'
  | 'refund_reversal';

export interface InventoryMovement {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  movement_type: InventoryMovementType;
  quantity_change: number; // positive for additions, negative for deductions
  unit: IngredientUnit;
  previous_stock: number;
  resulting_stock: number;
  reference_type?: 'order' | 'purchase' | 'manual' | 'opname';
  reference_id?: string;
  user_name: string;
  notes?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  total_orders_count: number;
  total_spending: number;
  first_order_date?: string;
  last_order_date?: string;
  created_at: string;
}

export type OrderChannel = 'pos_offline' | 'whatsapp' | 'shopeefood' | 'grabfood' | 'gofood';
export type OrderStatus =
  | 'menunggu_konfirmasi'
  | 'dikonfirmasi'
  | 'diproses'
  | 'siap_diambil'
  | 'dalam_pengiriman'
  | 'selesai'
  | 'dibatalkan';

export type PaymentMethod = 'tunai' | 'qris' | 'transfer_bank' | 'debit' | 'shopeepay' | 'gopay' | 'ovo';
export type PaymentStatus = 'belum_bayar' | 'dibayar' | 'refund';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_name?: string;
  addons_summary?: string;
  unit_price: number;
  unit_hpp: number;
  quantity: number;
  subtotal_price: number;
  subtotal_hpp: number;
  notes?: string;
}

export interface Order {
  id: string;
  order_number: string;
  external_order_id?: string; // For ShopeeFood/GrabFood reference
  channel: OrderChannel;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  
  // Financial breakdown
  subtotal_amount: number;
  discount_amount: number;
  discount_description?: string;
  tax_amount: number;
  service_charge: number;
  delivery_fee: number;
  gross_total: number;
  
  // Platform fees (Online channels)
  platform_commission: number;
  platform_service_fee: number;
  actual_payout: number; // What K99 actually receives
  
  // Cost & Profit
  total_hpp: number;
  gross_profit: number;
  
  // Payment specifics
  cash_received?: number;
  cash_change?: number;
  paid_at?: string;
  
  notes?: string;
  cashier_name?: string;
  shift_id?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | 'sewa'
  | 'listrik'
  | 'air'
  | 'internet'
  | 'gaji'
  | 'perawatan'
  | 'pemasaran'
  | 'transportasi'
  | 'peralatan'
  | 'lainnya';

export interface Expense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  category_label: string;
  description: string;
  amount: number;
  payment_method: string;
  recorded_by: string;
  attachment_url?: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // e.g. 10 for 10%, or 5000 for Rp 5.000
  minimum_order_amount: number;
  maximum_discount?: number;
  channels: OrderChannel[];
  is_active: boolean;
  start_date: string;
  end_date: string;
  usage_count: number;
  usage_limit?: number;
  created_at: string;
}

export interface CashShift {
  id: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
  opening_cash: number;
  cash_sales: number;
  cash_refunds: number;
  cash_inflows: number;
  cash_outflows: number;
  expected_closing_cash: number;
  actual_closing_cash?: number;
  discrepancy?: number;
  notes?: string;
  total_transactions_count: number;
}

export interface CashMovement {
  id: string;
  shift_id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  reason: string;
  authorized_by: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

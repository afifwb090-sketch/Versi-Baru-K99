-- ============================================================================
-- K99 POS SYSTEM - KOPI 99 WARUNGBOTO, YOGYAKARTA
-- Migration 01: Core Schema & Table Definitions (PostgreSQL / Supabase)
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. PROFILES (Staff & User accounts linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'manager', 'cashier', 'inventory_staff')),
  phone text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. BUSINESS SETTINGS
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Kopi 99 Warungboto',
  tagline text default 'Kopi & Matcha Kekinian',
  address text not null default 'Jl. Veteran No. 99, Warungboto, Umbulharjo, Yogyakarta 55164',
  city text default 'Yogyakarta',
  phone text default '081299990099',
  whatsapp_number text not null default '6281299990099',
  opening_hours text default '08:00 - 23:00 WIB',
  timezone text default 'Asia/Jakarta',
  currency text default 'IDR',
  tax_enabled boolean default false,
  tax_percentage numeric(5, 2) default 10.00,
  service_charge_percentage numeric(5, 2) default 0.00,
  receipt_header text default 'KOPI 99 WARUNGBOTO\nJl. Veteran, Umbulharjo, Yogyakarta',
  receipt_footer text default 'Terima kasih atas kunjungan Anda!\nFollow IG: @kopi99warungboto',
  order_prefix_offline text default 'K99-POS',
  order_prefix_online text default 'K99-ONL',
  low_stock_threshold_default integer default 10,
  online_ordering_active boolean default true,
  is_store_open boolean default true,
  store_closed_message text default 'Mohon maaf, Kopi 99 Warungboto saat ini sedang TUTUP. Kami buka kembali setiap hari pukul 08:00 - 23:00 WIB.',
  delivery_available boolean default true,
  pickup_available boolean default true,
  instagram_url text default 'https://instagram.com/kopi99warungboto',
  google_maps_url text default 'https://maps.google.com/?q=Warungboto+Yogyakarta',
  updated_at timestamptz default now() not null
);

-- 3. PRODUCT CATEGORIES
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- 4. PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category_id uuid references public.product_categories(id) on delete set null,
  image_url text,
  price_offline numeric(12, 2) not null check (price_offline >= 0),
  price_online numeric(12, 2) not null check (price_online >= 0),
  estimated_hpp numeric(12, 2) default 0 check (estimated_hpp >= 0),
  is_active boolean default true,
  is_online_available boolean default true,
  is_offline_available boolean default true,
  preparation_time_minutes integer default 5,
  sort_order integer default 0,
  has_recipe boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. PRODUCT VARIANTS (Hot/Iced, Regular/Large, etc.)
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text not null,
  price_offline numeric(12, 2) not null check (price_offline >= 0),
  price_online numeric(12, 2) not null check (price_online >= 0),
  estimated_hpp numeric(12, 2) default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- 6. PRODUCT ADDONS (Extra shot, Jelly, Syrup, etc.)
create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  estimated_hpp numeric(12, 2) default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- 7. SUPPLIERS
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  contact_person text,
  phone text not null,
  email text,
  address text,
  notes text,
  balance_payable numeric(12, 2) default 0,
  created_at timestamptz default now() not null
);

-- 8. INGREDIENTS (Bahan Baku & Packaging)
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null check (category in ('coffee', 'dairy', 'syrup', 'powder', 'tea', 'packaging', 'other')),
  purchase_quantity numeric(10, 3) not null check (purchase_quantity > 0),
  purchase_price numeric(12, 2) not null check (purchase_price >= 0),
  base_unit text not null check (base_unit in ('gram', 'kg', 'ml', 'liter', 'pcs', 'bottle', 'pack')),
  cost_per_base_unit numeric(12, 4) not null default 0,
  current_stock numeric(10, 3) not null default 0,
  minimum_stock numeric(10, 3) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  expiration_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 9. RECIPES
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  notes text,
  total_ingredient_cost numeric(12, 2) default 0,
  total_packaging_cost numeric(12, 2) default 0,
  total_hpp numeric(12, 2) default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (product_id, variant_id)
);

-- 10. RECIPE ITEMS
create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(10, 3) not null check (quantity > 0),
  unit text not null,
  unit_cost numeric(12, 4) not null default 0,
  subtotal_cost numeric(12, 2) not null default 0,
  is_packaging boolean default false
);

-- 11. PURCHASES (Pembelian Bahan Baku)
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  invoice_number text,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  purchase_date date not null default current_date,
  due_date date,
  status text not null check (status in ('ordered', 'received', 'cancelled')),
  payment_status text not null check (payment_status in ('unpaid', 'partial', 'paid')),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  paid_amount numeric(12, 2) default 0 check (paid_amount >= 0),
  notes text,
  received_at timestamptz,
  received_by text,
  created_at timestamptz default now() not null
);

-- 12. PURCHASE ITEMS
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(10, 3) not null check (quantity > 0),
  unit text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  expiration_date date
);

-- 13. INVENTORY MOVEMENTS (Kartu Stok & Audit Trail)
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  movement_type text not null check (movement_type in ('sale', 'purchase_receive', 'spoilage_waste', 'stock_opname', 'adjustment', 'refund_reversal')),
  quantity_change numeric(10, 3) not null,
  unit text not null,
  previous_stock numeric(10, 3) not null,
  resulting_stock numeric(10, 3) not null,
  reference_type text,
  reference_id text,
  user_name text not null,
  notes text,
  created_at timestamptz default now() not null
);

-- 14. STOCK COUNTS (Stock Opname)
create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  opname_number text not null unique,
  performed_by text not null,
  notes text,
  status text not null check (status in ('draft', 'completed')),
  total_discrepancy_value numeric(12, 2) default 0,
  created_at timestamptz default now() not null,
  completed_at timestamptz
);

-- 15. CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text,
  notes text,
  total_orders_count integer default 0,
  total_spending numeric(12, 2) default 0,
  created_at timestamptz default now() not null
);

-- 16. CASH SHIFTS (Shift Kasir)
create table if not exists public.cash_shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_id text not null,
  cashier_name text not null,
  opened_at timestamptz default now() not null,
  closed_at timestamptz,
  status text not null check (status in ('open', 'closed')),
  opening_cash numeric(12, 2) not null check (opening_cash >= 0),
  cash_sales numeric(12, 2) default 0,
  cash_refunds numeric(12, 2) default 0,
  cash_inflows numeric(12, 2) default 0,
  cash_outflows numeric(12, 2) default 0,
  expected_closing_cash numeric(12, 2) default 0,
  actual_closing_cash numeric(12, 2),
  discrepancy numeric(12, 2),
  notes text,
  total_transactions_count integer default 0
);

-- 17. CASH MOVEMENTS (Kas Masuk/Keluar selama Shift)
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.cash_shifts(id) on delete cascade,
  type text not null check (type in ('cash_in', 'cash_out')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null,
  authorized_by text not null,
  created_at timestamptz default now() not null
);

-- 18. ORDERS (Pesanan Offline & Online)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  external_order_id text,
  channel text not null check (channel in ('pos_offline', 'whatsapp', 'shopeefood', 'grabfood', 'gofood')),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  order_type text not null check (order_type in ('dine_in', 'takeaway', 'delivery', 'pickup')),
  status text not null check (status in ('menunggu_konfirmasi', 'dikonfirmasi', 'diproses', 'siap_diambil', 'dalam_pengiriman', 'selesai', 'dibatalkan')),
  payment_status text not null check (payment_status in ('belum_bayar', 'dibayar', 'refund')),
  payment_method text check (payment_method in ('tunai', 'qris', 'transfer_bank', 'debit', 'shopeepay', 'gopay', 'ovo')),
  
  -- Financial Totals
  subtotal_amount numeric(12, 2) not null check (subtotal_amount >= 0),
  discount_amount numeric(12, 2) default 0 check (discount_amount >= 0),
  discount_description text,
  tax_amount numeric(12, 2) default 0,
  service_charge numeric(12, 2) default 0,
  delivery_fee numeric(12, 2) default 0,
  gross_total numeric(12, 2) not null check (gross_total >= 0),
  
  -- Online Platform Specifics
  platform_commission numeric(12, 2) default 0,
  platform_service_fee numeric(12, 2) default 0,
  actual_payout numeric(12, 2) default 0,
  
  -- COGS / HPP & Profit
  total_hpp numeric(12, 2) default 0,
  gross_profit numeric(12, 2) default 0,
  
  -- Cash detail
  cash_received numeric(12, 2),
  cash_change numeric(12, 2),
  paid_at timestamptz,
  
  notes text,
  cashier_name text,
  shift_id uuid references public.cash_shifts(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 19. ORDER ITEMS
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  variant_name text,
  addons_summary text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_hpp numeric(12, 2) not null default 0,
  quantity integer not null check (quantity > 0),
  subtotal_price numeric(12, 2) not null check (subtotal_price >= 0),
  subtotal_hpp numeric(12, 2) not null default 0,
  notes text
);

-- 20. PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null,
  amount numeric(12, 2) not null check (amount > 0),
  reference_number text,
  status text not null default 'success',
  created_at timestamptz default now() not null
);

-- 21. REFUNDS & VOIDS
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null,
  authorized_by text not null,
  inventory_returned boolean default false,
  created_at timestamptz default now() not null
);

-- 22. EXPENSES (Biaya Operasional)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null check (category in ('sewa', 'listrik', 'air', 'internet', 'gaji', 'perawatan', 'pemasaran', 'transportasi', 'peralatan', 'lainnya')),
  category_label text not null,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'tunai',
  recorded_by text not null,
  attachment_url text,
  created_at timestamptz default now() not null
);

-- 23. PROMOTIONS
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 2) default 0,
  maximum_discount numeric(12, 2),
  channels text[] not null default array['pos_offline', 'whatsapp'],
  is_active boolean default true,
  start_date date not null,
  end_date date not null,
  usage_count integer default 0,
  usage_limit integer,
  created_at timestamptz default now() not null
);

-- 24. AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb,
  ip_address text,
  created_at timestamptz default now() not null
);

-- 25. IDEMPOTENCY KEYS (Protection against duplicate POS sales and checkout double-clicks)
create table if not exists public.idempotency_keys (
  id text primary key,
  order_id uuid references public.orders(id) on delete set null,
  response jsonb,
  created_at timestamptz default now() not null
);

-- INDEXES FOR MAXIMUM QUERY EFFICIENCY
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_channel on public.orders(channel);
create index if not exists idx_orders_shift on public.orders(shift_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_inventory_movements_ingredient on public.inventory_movements(ingredient_id);
create index if not exists idx_expenses_date on public.expenses(expense_date desc);
create index if not exists idx_promotions_code on public.promotions(code);

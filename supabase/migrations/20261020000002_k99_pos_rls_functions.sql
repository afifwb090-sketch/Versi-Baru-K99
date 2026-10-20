-- ============================================================================
-- K99 POS SYSTEM - KOPI 99 WARUNGBOTO
-- Migration 02: Row Level Security (RLS) & Atomic Stored Functions
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_addons enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_counts enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.expenses enable row level security;
alter table public.promotions enable row level security;
alter table public.cash_shifts enable row level security;
alter table public.cash_movements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.idempotency_keys enable row level security;

-- Helper function to get current user role from profiles
create or replace function public.get_current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- 2. PUBLIC POLICIES (Unauthenticated web visitors)
-- Public can view active published menu categories and settings
create policy "Public can view active categories"
  on public.product_categories for select
  using (is_active = true);

create policy "Public can view active online products"
  on public.products for select
  using (is_active = true and is_online_available = true);

create policy "Public can view active variants"
  on public.product_variants for select
  using (is_active = true);

create policy "Public can view active addons"
  on public.product_addons for select
  using (is_active = true);

create policy "Public can view general business settings"
  on public.business_settings for select
  using (true);

create policy "Public can view active promotions"
  on public.promotions for select
  using (is_active = true and start_date <= current_date and end_date >= current_date);

-- Public can submit online order (WhatsApp checkout)
create policy "Public can insert orders"
  on public.orders for insert
  with check (channel in ('whatsapp') and status = 'menunggu_konfirmasi');

create policy "Public can insert order items"
  on public.order_items for insert
  with check (true);

-- 3. AUTHENTICATED STAFF POLICIES
-- Profiles
create policy "Users can view their own profile or managers view all"
  on public.profiles for select
  using (auth.uid() = id or public.get_current_user_role() in ('owner', 'manager'));

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Owners and managers can manage profiles"
  on public.profiles for all
  using (public.get_current_user_role() in ('owner', 'manager'));

-- Auto-create profile trigger on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Products, Categories & Settings (Managers and Owners can edit)
create policy "Staff can view all products"
  on public.products for select
  to authenticated
  using (true);

create policy "Managers and Owners can modify products"
  on public.products for all
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager'));

create policy "Managers and Owners can modify categories"
  on public.product_categories for all
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager'));

create policy "Managers and Owners can modify business settings"
  on public.business_settings for update
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager'));

-- Ingredients & Recipes: Protected from public & cashiers (accessible only to inventory staff, managers, owner)
create policy "Authorized staff view ingredients"
  on public.ingredients for select
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager', 'inventory_staff'));

create policy "Authorized staff manage ingredients"
  on public.ingredients for all
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager', 'inventory_staff'));

create policy "Authorized staff view recipes"
  on public.recipes for select
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager', 'inventory_staff'));

create policy "Authorized staff manage recipes"
  on public.recipes for all
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager', 'inventory_staff'));

create policy "Authorized staff view recipe items"
  on public.recipe_items for select
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager', 'inventory_staff'));

-- Orders & Order Items
create policy "Staff can view and update orders"
  on public.orders for all
  to authenticated
  using (true);

create policy "Staff can manage order items"
  on public.order_items for all
  to authenticated
  using (true);

-- Shifts & Cash Movements
create policy "Cashiers and Managers can manage shifts"
  on public.cash_shifts for all
  to authenticated
  using (true);

create policy "Cashiers and Managers can manage cash movements"
  on public.cash_movements for all
  to authenticated
  using (true);

-- Expenses & Financials: Only managers and owners
create policy "Managers and Owners manage expenses"
  on public.expenses for all
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager'));

-- Audit logs
create policy "Staff can view audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.get_current_user_role() in ('owner', 'manager'));

create policy "Staff can insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);

-- 4. ATOMIC DATABASE FUNCTION FOR POS SALE (Includes automatic inventory deduction)
create or replace function public.process_pos_sale(
  p_order_number text,
  p_customer_name text,
  p_order_type text,
  p_payment_method text,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_gross_total numeric,
  p_total_hpp numeric,
  p_cash_received numeric,
  p_cash_change numeric,
  p_cashier_name text,
  p_shift_id uuid,
  p_items jsonb
) returns uuid as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_recipe_rec record;
  v_item_qty integer;
begin
  -- 1. Insert Order
  insert into public.orders (
    order_number, channel, customer_name, order_type,
    status, payment_status, payment_method,
    subtotal_amount, discount_amount, tax_amount,
    gross_total, total_hpp, gross_profit,
    cash_received, cash_change, cashier_name, shift_id, paid_at
  ) values (
    p_order_number, 'pos_offline', coalesce(p_customer_name, 'Pelanggan Walk-In'), p_order_type,
    'selesai', 'dibayar', p_payment_method,
    p_subtotal, p_discount, p_tax,
    p_gross_total, p_total_hpp, (p_subtotal - p_discount - p_total_hpp),
    p_cash_received, p_cash_change, p_cashier_name, p_shift_id, now()
  ) returning id into v_order_id;

  -- 2. Insert Order Items and Deduct Recipe Inventory atomically
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_item_qty := (v_item->>'quantity')::integer;

    insert into public.order_items (
      order_id, product_id, product_name, variant_name,
      addons_summary, unit_price, unit_hpp, quantity,
      subtotal_price, subtotal_hpp, notes
    ) values (
      v_order_id,
      v_product_id,
      v_item->>'product_name',
      v_item->>'variant_name',
      v_item->>'addons_summary',
      (v_item->>'unit_price')::numeric,
      (v_item->>'unit_hpp')::numeric,
      v_item_qty,
      (v_item->>'subtotal_price')::numeric,
      (v_item->>'subtotal_hpp')::numeric,
      v_item->>'notes'
    );

    -- Find recipe items and reduce stock
    for v_recipe_rec in
      select ri.ingredient_id, ri.quantity, i.name as ing_name, i.current_stock
      from public.recipes r
      join public.recipe_items ri on ri.recipe_id = r.id
      join public.ingredients i on i.id = ri.ingredient_id
      where r.product_id = v_product_id
    loop
      -- Deduct ingredient stock
      update public.ingredients
      set current_stock = current_stock - (v_recipe_rec.quantity * v_item_qty),
          updated_at = now()
      where id = v_recipe_rec.ingredient_id;

      -- Record inventory movement
      insert into public.inventory_movements (
        ingredient_id, ingredient_name, movement_type,
        quantity_change, unit, previous_stock, resulting_stock,
        reference_type, reference_id, user_name, notes
      ) values (
        v_recipe_rec.ingredient_id,
        v_recipe_rec.ing_name,
        'sale',
        -(v_recipe_rec.quantity * v_item_qty),
        'pcs',
        v_recipe_rec.current_stock,
        v_recipe_rec.current_stock - (v_recipe_rec.quantity * v_item_qty),
        'order',
        v_order_id::text,
        p_cashier_name,
        'Otomatis terpotong dari transaksi kasir ' || p_order_number
      );
    end loop;
  end loop;

  -- 3. If in an active shift, increment shift cash sales if paid with cash
  if p_shift_id is not null then
    if p_payment_method = 'tunai' then
      update public.cash_shifts
      set cash_sales = cash_sales + p_gross_total,
          expected_closing_cash = expected_closing_cash + p_gross_total,
          total_transactions_count = total_transactions_count + 1
      where id = p_shift_id;
    else
      update public.cash_shifts
      set total_transactions_count = total_transactions_count + 1
      where id = p_shift_id;
    end if;
  end if;

  return v_order_id;
end;
$$ language plpgsql security definer;

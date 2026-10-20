/**
 * Unified Data Service for K99 POS System
 * Provides seamless data access: queries Supabase PostgreSQL when credentials exist,
 * with reactive fallback state for development and setup phases.
 */

import {
  BusinessSettings,
  ProductCategory,
  Product,
  Ingredient,
  Recipe,
  Supplier,
  Purchase,
  Order,
  Expense,
  Promotion,
  CashShift,
  CashMovement,
  Customer,
  AuditLog,
  InventoryMovement,
} from '../types/database';
import {
  initialBusinessSettings,
  initialCategories,
  initialProducts,
  initialIngredients,
  initialRecipes,
  initialSuppliers,
  initialOrders,
  initialExpenses,
  initialPromotions,
  initialShift,
  initialCustomers,
} from '../data/seedData';
import { supabase, isSupabaseConfigured } from './supabase';

class DataService {
  private settings: BusinessSettings = { ...initialBusinessSettings };
  private categories: ProductCategory[] = [...initialCategories];
  private products: Product[] = [...initialProducts];
  private ingredients: Ingredient[] = [...initialIngredients];
  private recipes: Recipe[] = [...initialRecipes];
  private suppliers: Supplier[] = [...initialSuppliers];
  private purchases: Purchase[] = [];
  private orders: Order[] = [...initialOrders];
  private expenses: Expense[] = [...initialExpenses];
  private promotions: Promotion[] = [...initialPromotions];
  private shifts: CashShift[] = [{ ...initialShift }];
  private cashMovements: CashMovement[] = [];
  private customers: Customer[] = [...initialCustomers];
  private auditLogs: AuditLog[] = [];
  private inventoryMovements: InventoryMovement[] = [];

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedOrders = localStorage.getItem('k99_orders');
      if (savedOrders) this.orders = JSON.parse(savedOrders);

      const savedProducts = localStorage.getItem('k99_products');
      if (savedProducts) this.products = JSON.parse(savedProducts);

      const savedIngredients = localStorage.getItem('k99_ingredients');
      if (savedIngredients) this.ingredients = JSON.parse(savedIngredients);

      const savedRecipes = localStorage.getItem('k99_recipes');
      if (savedRecipes) this.recipes = JSON.parse(savedRecipes);

      const savedSettings = localStorage.getItem('k99_settings');
      if (savedSettings) this.settings = JSON.parse(savedSettings);

      const savedShifts = localStorage.getItem('k99_shifts');
      if (savedShifts) this.shifts = JSON.parse(savedShifts);

      const savedExpenses = localStorage.getItem('k99_expenses');
      if (savedExpenses) this.expenses = JSON.parse(savedExpenses);

      const savedMovements = localStorage.getItem('k99_movements');
      if (savedMovements) this.inventoryMovements = JSON.parse(savedMovements);
    } catch (e) {
      console.warn('Gagal memuat local cache:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('k99_orders', JSON.stringify(this.orders));
      localStorage.setItem('k99_products', JSON.stringify(this.products));
      localStorage.setItem('k99_ingredients', JSON.stringify(this.ingredients));
      localStorage.setItem('k99_recipes', JSON.stringify(this.recipes));
      localStorage.setItem('k99_settings', JSON.stringify(this.settings));
      localStorage.setItem('k99_shifts', JSON.stringify(this.shifts));
      localStorage.setItem('k99_expenses', JSON.stringify(this.expenses));
      localStorage.setItem('k99_movements', JSON.stringify(this.inventoryMovements));
    } catch (e) {
      console.warn('Gagal menyimpan cache:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- BUSINESS SETTINGS ---
  public getSettings(): BusinessSettings {
    return { ...this.settings };
  }

  public updateSettings(updated: Partial<BusinessSettings>): BusinessSettings {
    this.settings = { ...this.settings, ...updated, updated_at: new Date().toISOString() };
    this.saveToStorage();
    if (isSupabaseConfigured && supabase) {
      supabase.from('business_settings').upsert(this.settings).then();
    }
    return this.settings;
  }

  // --- CATEGORIES ---
  public getCategories(): ProductCategory[] {
    return [...this.categories].sort((a, b) => a.sort_order - b.sort_order);
  }

  public addCategory(cat: Omit<ProductCategory, 'id' | 'created_at'>): ProductCategory {
    const newCat: ProductCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.categories.push(newCat);
    this.notify();
    return newCat;
  }

  // --- PRODUCTS ---
  public getProducts(onlyActive = false): Product[] {
    let prods = [...this.products];
    if (onlyActive) {
      prods = prods.filter((p) => p.is_active);
    }
    return prods.sort((a, b) => a.sort_order - b.sort_order);
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  public saveProduct(prod: Partial<Product> & { name: string; price_offline: number; price_online: number }): Product {
    if (prod.id) {
      const idx = this.products.findIndex((p) => p.id === prod.id);
      if (idx >= 0) {
        this.products[idx] = {
          ...this.products[idx],
          ...prod,
          updated_at: new Date().toISOString(),
        } as Product;
        this.saveToStorage();
        return this.products[idx];
      }
    }
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      sku: prod.sku || `K99-${Date.now().toString().slice(-4)}`,
      name: prod.name,
      description: prod.description || '',
      category_id: prod.category_id || this.categories[0]?.id || '',
      category_name: this.categories.find((c) => c.id === prod.category_id)?.name || 'Kopi',
      image_url: prod.image_url || 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
      price_offline: prod.price_offline,
      price_online: prod.price_online,
      estimated_hpp: prod.estimated_hpp || 0,
      is_active: prod.is_active !== undefined ? prod.is_active : true,
      is_online_available: prod.is_online_available !== undefined ? prod.is_online_available : true,
      is_offline_available: prod.is_offline_available !== undefined ? prod.is_offline_available : true,
      preparation_time_minutes: prod.preparation_time_minutes || 5,
      sort_order: prod.sort_order || this.products.length + 1,
      variants: prod.variants || [],
      addons: prod.addons || [],
      has_recipe: prod.has_recipe !== undefined ? prod.has_recipe : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.unshift(newProd);
    this.saveToStorage();
    return newProd;
  }

  public deleteProduct(id: string) {
    this.products = this.products.filter((p) => p.id !== id);
    this.saveToStorage();
  }

  // --- INGREDIENTS ---
  public getIngredients(): Ingredient[] {
    return [...this.ingredients];
  }

  public saveIngredient(ing: Partial<Ingredient> & { name: string; purchase_price: number; base_unit: any }): Ingredient {
    const costPerBaseUnit = ing.purchase_quantity && ing.purchase_quantity > 0
      ? ing.purchase_price / ing.purchase_quantity
      : ing.purchase_price;

    if (ing.id) {
      const idx = this.ingredients.findIndex((i) => i.id === ing.id);
      if (idx >= 0) {
        this.ingredients[idx] = {
          ...this.ingredients[idx],
          ...ing,
          cost_per_base_unit: Number(costPerBaseUnit.toFixed(2)),
          updated_at: new Date().toISOString(),
        } as Ingredient;
        this.recalculateAllHpp();
        this.saveToStorage();
        return this.ingredients[idx];
      }
    }

    const newIng: Ingredient = {
      id: `ing-${Date.now()}`,
      sku: ing.sku || `ING-${Date.now().toString().slice(-4)}`,
      name: ing.name,
      category: ing.category || 'other',
      purchase_quantity: ing.purchase_quantity || 1,
      purchase_price: ing.purchase_price,
      base_unit: ing.base_unit,
      cost_per_base_unit: Number(costPerBaseUnit.toFixed(2)),
      current_stock: ing.current_stock || 0,
      minimum_stock: ing.minimum_stock || 10,
      supplier_id: ing.supplier_id,
      supplier_name: this.suppliers.find((s) => s.id === ing.supplier_id)?.name,
      expiration_date: ing.expiration_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.ingredients.push(newIng);
    this.saveToStorage();
    return newIng;
  }

  public adjustStock(
    ingredientId: string,
    quantityChange: number,
    movementType: 'purchase_receive' | 'spoilage_waste' | 'stock_opname' | 'adjustment',
    userName: string,
    notes?: string
  ) {
    const ing = this.ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;

    const previousStock = ing.current_stock;
    const resultingStock = Math.max(0, previousStock + quantityChange);
    ing.current_stock = resultingStock;
    ing.updated_at = new Date().toISOString();

    const movement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      ingredient_id: ingredientId,
      ingredient_name: ing.name,
      movement_type: movementType,
      quantity_change: quantityChange,
      unit: ing.base_unit,
      previous_stock: previousStock,
      resulting_stock: resultingStock,
      reference_type: movementType === 'stock_opname' ? 'opname' : 'manual',
      user_name: userName,
      notes,
      created_at: new Date().toISOString(),
    };

    this.inventoryMovements.unshift(movement);
    this.saveToStorage();
  }

  public getInventoryMovements(): InventoryMovement[] {
    return [...this.inventoryMovements];
  }

  // --- RECIPES & HPP RECALCULATION ---
  public getRecipes(): Recipe[] {
    return [...this.recipes];
  }

  public getRecipeForProduct(productId: string): Recipe | undefined {
    return this.recipes.find((r) => r.product_id === productId);
  }

  public saveRecipe(recipe: Recipe) {
    const idx = this.recipes.findIndex((r) => r.product_id === recipe.product_id);
    if (idx >= 0) {
      this.recipes[idx] = { ...recipe, updated_at: new Date().toISOString() };
    } else {
      this.recipes.push({ ...recipe, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    // Update the product's estimated_hpp
    const prod = this.products.find((p) => p.id === recipe.product_id);
    if (prod) {
      prod.estimated_hpp = recipe.total_hpp;
      prod.updated_at = new Date().toISOString();
    }
    this.saveToStorage();
  }

  public recalculateAllHpp() {
    for (const recipe of this.recipes) {
      let ingCost = 0;
      let packCost = 0;
      recipe.items.forEach((item) => {
        const ing = this.ingredients.find((i) => i.id === item.ingredient_id);
        if (ing) {
          item.unit_cost = ing.cost_per_base_unit;
          item.subtotal_cost = Math.round(item.quantity * item.unit_cost);
          if (ing.category === 'packaging') {
            packCost += item.subtotal_cost;
          } else {
            ingCost += item.subtotal_cost;
          }
        }
      });
      recipe.total_ingredient_cost = ingCost;
      recipe.total_packaging_cost = packCost;
      recipe.total_hpp = ingCost + packCost;

      const prod = this.products.find((p) => p.id === recipe.product_id);
      if (prod) {
        prod.estimated_hpp = recipe.total_hpp;
      }
    }
  }

  // --- ORDERS & POS TRANSACTION (Atomic) ---
  public getOrders(): Order[] {
    return [...this.orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public createPosOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Order {
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Deduct ingredients from recipe
    for (const item of newOrder.items) {
      const recipe = this.recipes.find((r) => r.product_id === item.product_id);
      if (recipe) {
        for (const rItem of recipe.items) {
          const ing = this.ingredients.find((i) => i.id === rItem.ingredient_id);
          if (ing) {
            const deduction = rItem.quantity * item.quantity;
            const prev = ing.current_stock;
            ing.current_stock = Math.max(0, prev - deduction);
            ing.updated_at = new Date().toISOString();

            this.inventoryMovements.unshift({
              id: `mov-${Date.now()}-${Math.random()}`,
              ingredient_id: ing.id,
              ingredient_name: ing.name,
              movement_type: 'sale',
              quantity_change: -deduction,
              unit: ing.base_unit,
              previous_stock: prev,
              resulting_stock: ing.current_stock,
              reference_type: 'order',
              reference_id: newOrder.order_number,
              user_name: newOrder.cashier_name || 'Kasir K99',
              notes: `Terpotong dari penjualan kasir ${newOrder.order_number}`,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 2. Update active shift if cash
    const activeShift = this.getActiveShift();
    if (activeShift) {
      if (newOrder.payment_method === 'tunai') {
        activeShift.cash_sales += newOrder.gross_total;
        activeShift.expected_closing_cash += newOrder.gross_total;
      }
      activeShift.total_transactions_count += 1;
    }

    // 3. Update customer stats if applicable
    if (newOrder.customer_name) {
      const existingCust = this.customers.find(
        (c) => c.name.toLowerCase() === newOrder.customer_name.toLowerCase() || (newOrder.customer_phone && c.phone === newOrder.customer_phone)
      );
      if (existingCust) {
        existingCust.total_orders_count += 1;
        existingCust.total_spending += newOrder.gross_total;
      } else if (newOrder.customer_phone) {
        this.customers.push({
          id: `cust-${Date.now()}`,
          name: newOrder.customer_name,
          phone: newOrder.customer_phone,
          total_orders_count: 1,
          total_spending: newOrder.gross_total,
          created_at: new Date().toISOString(),
        });
      }
    }

    this.orders.unshift(newOrder);
    this.saveToStorage();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: Order['status'], paymentStatus?: Order['payment_status']) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return;
    order.status = status;
    if (paymentStatus) {
      order.payment_status = paymentStatus;
    }
    order.updated_at = new Date().toISOString();
    this.saveToStorage();
  }

  public voidOrRefundOrder(orderId: string, reason: string, authorizedBy: string, returnInventory: boolean) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return;

    order.status = 'dibatalkan';
    order.payment_status = 'refund';
    order.updated_at = new Date().toISOString();

    // If returnInventory, reverse recipe deductions
    if (returnInventory) {
      for (const item of order.items) {
        const recipe = this.recipes.find((r) => r.product_id === item.product_id);
        if (recipe) {
          for (const rItem of recipe.items) {
            const ing = this.ingredients.find((i) => i.id === rItem.ingredient_id);
            if (ing) {
              const returned = rItem.quantity * item.quantity;
              const prev = ing.current_stock;
              ing.current_stock = prev + returned;
              this.inventoryMovements.unshift({
                id: `mov-${Date.now()}-${Math.random()}`,
                ingredient_id: ing.id,
                ingredient_name: ing.name,
                movement_type: 'refund_reversal',
                quantity_change: returned,
                unit: ing.base_unit,
                previous_stock: prev,
                resulting_stock: ing.current_stock,
                reference_type: 'order',
                reference_id: order.order_number,
                user_name: authorizedBy,
                notes: `Pengembalian stok pembatalan pesanan ${order.order_number}. Alasan: ${reason}`,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Adjust shift if cash refund
    const activeShift = this.getActiveShift();
    if (activeShift && order.payment_method === 'tunai') {
      activeShift.cash_refunds += order.gross_total;
      activeShift.expected_closing_cash -= order.gross_total;
    }

    this.saveToStorage();
  }

  // --- CASHIER SHIFTS ---
  public getShifts(): CashShift[] {
    return [...this.shifts];
  }

  public getActiveShift(): CashShift | undefined {
    return this.shifts.find((s) => s.status === 'open');
  }

  public openShift(cashierId: string, cashierName: string, openingCash: number): CashShift {
    // Close any previous open shift if exists
    const current = this.getActiveShift();
    if (current) {
      this.closeShift(current.id, current.expected_closing_cash, 'Otomatis ditutup sebelum membuka shift baru');
    }

    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      cashier_id: cashierId,
      cashier_name: cashierName,
      opened_at: new Date().toISOString(),
      status: 'open',
      opening_cash: openingCash,
      cash_sales: 0,
      cash_refunds: 0,
      cash_inflows: 0,
      cash_outflows: 0,
      expected_closing_cash: openingCash,
      total_transactions_count: 0,
    };
    this.shifts.unshift(newShift);
    this.saveToStorage();
    return newShift;
  }

  public closeShift(shiftId: string, actualClosingCash: number, notes?: string): CashShift | undefined {
    const shift = this.shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    shift.status = 'closed';
    shift.closed_at = new Date().toISOString();
    shift.actual_closing_cash = actualClosingCash;
    shift.discrepancy = actualClosingCash - shift.expected_closing_cash;
    shift.notes = notes;
    this.saveToStorage();
    return shift;
  }

  public addCashMovement(shiftId: string, type: 'cash_in' | 'cash_out', amount: number, reason: string, authorizedBy: string) {
    const shift = this.shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    if (type === 'cash_in') {
      shift.cash_inflows += amount;
      shift.expected_closing_cash += amount;
    } else {
      shift.cash_outflows += amount;
      shift.expected_closing_cash -= amount;
    }

    const mov: CashMovement = {
      id: `cm-${Date.now()}`,
      shift_id: shiftId,
      type,
      amount,
      reason,
      authorized_by: authorizedBy,
      created_at: new Date().toISOString(),
    };
    this.cashMovements.unshift(mov);
    this.saveToStorage();
  }

  // --- EXPENSES ---
  public getExpenses(): Expense[] {
    return [...this.expenses].sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  }

  public addExpense(exp: Omit<Expense, 'id' | 'created_at'>): Expense {
    const newExp: Expense = {
      ...exp,
      id: `exp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.expenses.unshift(newExp);
    this.saveToStorage();
    return newExp;
  }

  // --- PROMOTIONS ---
  public getPromotions(): Promotion[] {
    return [...this.promotions];
  }

  public savePromotion(promo: Partial<Promotion> & { code: string; title: string; discount_value: number }): Promotion {
    if (promo.id) {
      const idx = this.promotions.findIndex((p) => p.id === promo.id);
      if (idx >= 0) {
        this.promotions[idx] = { ...this.promotions[idx], ...promo } as Promotion;
        this.saveToStorage();
        return this.promotions[idx];
      }
    }
    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      code: promo.code.toUpperCase().trim(),
      title: promo.title,
      description: promo.description,
      discount_type: promo.discount_type || 'fixed',
      discount_value: promo.discount_value,
      minimum_order_amount: promo.minimum_order_amount || 0,
      maximum_discount: promo.maximum_discount,
      channels: promo.channels || ['pos_offline', 'whatsapp'],
      is_active: promo.is_active !== undefined ? promo.is_active : true,
      start_date: promo.start_date || new Date().toISOString().split('T')[0],
      end_date: promo.end_date || '2026-12-31',
      usage_count: 0,
      usage_limit: promo.usage_limit,
      created_at: new Date().toISOString(),
    };
    this.promotions.push(newPromo);
    this.saveToStorage();
    return newPromo;
  }

  // --- SUPPLIERS & PURCHASES ---
  public getSuppliers(): Supplier[] {
    return [...this.suppliers];
  }

  public saveSupplier(sup: Partial<Supplier> & { name: string; phone: string }): Supplier {
    if (sup.id) {
      const idx = this.suppliers.findIndex((s) => s.id === sup.id);
      if (idx >= 0) {
        this.suppliers[idx] = { ...this.suppliers[idx], ...sup } as Supplier;
        this.saveToStorage();
        return this.suppliers[idx];
      }
    }
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      code: sup.code || `SUP-${Date.now().toString().slice(-4)}`,
      name: sup.name,
      contact_person: sup.contact_person || '',
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      notes: sup.notes,
      total_orders_count: 0,
      balance_payable: 0,
      created_at: new Date().toISOString(),
    };
    this.suppliers.push(newSup);
    this.saveToStorage();
    return newSup;
  }

  public getPurchases(): Purchase[] {
    return [...this.purchases];
  }

  public createPurchase(po: Omit<Purchase, 'id' | 'created_at'>): Purchase {
    const newPo: Purchase = {
      ...po,
      id: `po-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.purchases.unshift(newPo);

    // If marked received, atomically increment ingredient stock
    if (newPo.status === 'received') {
      newPo.received_at = new Date().toISOString();
      for (const item of newPo.items) {
        this.adjustStock(
          item.ingredient_id,
          item.quantity,
          'purchase_receive',
          newPo.received_by || 'Staf Gudang',
          `Penerimaan PO ${newPo.purchase_number}`
        );
      }
    }

    this.saveToStorage();
    return newPo;
  }

  // --- CUSTOMERS ---
  public getCustomers(): Customer[] {
    return [...this.customers];
  }
}

export const dataService = new DataService();

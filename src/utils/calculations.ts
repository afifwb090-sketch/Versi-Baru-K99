/**
 * Pure calculation functions for K99 POS System
 * Fully decoupled for Node test runner verification
 */

export interface CartCalculationItem {
  price: number;
  quantity: number;
  hpp?: number;
}

export interface CartCalculationParams {
  items: CartCalculationItem[];
  discountAmount?: number;
  discountPercentage?: number;
  taxEnabled?: boolean;
  taxPercentage?: number;
  serviceChargePercentage?: number;
  deliveryFee?: number;
}

export interface CartCalculationResult {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  tax: number;
  serviceCharge: number;
  deliveryFee: number;
  grossTotal: number;
  totalHpp: number;
  estimatedGrossProfit: number;
}

/**
 * Calculates cart totals including discounts, optional PB1/PPN taxes, and HPP
 */
export function calculateCartTotals(params: CartCalculationParams): CartCalculationResult {
  const {
    items = [],
    discountAmount = 0,
    discountPercentage = 0,
    taxEnabled = false,
    taxPercentage = 10,
    serviceChargePercentage = 0,
    deliveryFee = 0,
  } = params;

  let subtotal = 0;
  let totalHpp = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity);
    subtotal += Math.round(item.price * qty);
    if (item.hpp) {
      totalHpp += Math.round(item.hpp * qty);
    }
  }

  // Calculate discount
  let discount = Math.max(0, discountAmount);
  if (discountPercentage > 0) {
    const pctDiscount = Math.round((subtotal * discountPercentage) / 100);
    discount = Math.max(discount, pctDiscount);
  }
  // Discount cannot exceed subtotal
  discount = Math.min(discount, subtotal);

  const subtotalAfterDiscount = subtotal - discount;

  // Service charge applied on discounted subtotal if configured
  const serviceCharge = serviceChargePercentage > 0
    ? Math.round((subtotalAfterDiscount * serviceChargePercentage) / 100)
    : 0;

  // Tax (e.g. Pajak PB1 Restoran 10%)
  const taxBasis = subtotalAfterDiscount + serviceCharge;
  const tax = taxEnabled && taxPercentage > 0
    ? Math.round((taxBasis * taxPercentage) / 100)
    : 0;

  const grossTotal = subtotalAfterDiscount + serviceCharge + tax + Math.max(0, deliveryFee);
  const estimatedGrossProfit = subtotalAfterDiscount - totalHpp;

  return {
    subtotal,
    discount,
    subtotalAfterDiscount,
    tax,
    serviceCharge,
    deliveryFee: Math.max(0, deliveryFee),
    grossTotal,
    totalHpp,
    estimatedGrossProfit,
  };
}

/**
 * Cash change calculation
 */
export function calculateCashChange(grossTotal: number, cashReceived: number): {
  change: number;
  isSufficient: boolean;
  shortage: number;
} {
  const diff = cashReceived - grossTotal;
  return {
    change: diff >= 0 ? diff : 0,
    isSufficient: diff >= 0,
    shortage: diff < 0 ? Math.abs(diff) : 0,
  };
}

/**
 * Unit conversion helper for coffee ingredients
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;

  // Mass
  if (fromUnit === 'kg' && toUnit === 'gram') return quantity * 1000;
  if (fromUnit === 'gram' && toUnit === 'kg') return quantity / 1000;

  // Volume
  if (fromUnit === 'liter' && toUnit === 'ml') return quantity * 1000;
  if (fromUnit === 'ml' && toUnit === 'liter') return quantity / 1000;

  return quantity;
}

/**
 * Calculates total recipe HPP given recipe items
 */
export interface RecipeItemCost {
  quantity: number;
  unitCost: number;
  isPackaging?: boolean;
}

export function calculateRecipeTotals(items: RecipeItemCost[]): {
  ingredientCost: number;
  packagingCost: number;
  totalHpp: number;
} {
  let ingredientCost = 0;
  let packagingCost = 0;

  for (const item of items) {
    const cost = Math.round(item.quantity * item.unitCost);
    if (item.isPackaging) {
      packagingCost += cost;
    } else {
      ingredientCost += cost;
    }
  }

  return {
    ingredientCost,
    packagingCost,
    totalHpp: ingredientCost + packagingCost,
  };
}

/**
 * Calculates profit margins and markup for a selling price against HPP
 */
export function calculateProfitMargins(sellingPrice: number, hpp: number): {
  grossProfit: number;
  marginPercent: number;
  markupPercent: number;
} {
  const grossProfit = sellingPrice - hpp;
  const marginPercent = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  const markupPercent = hpp > 0 ? (grossProfit / hpp) * 100 : 0;

  return {
    grossProfit,
    marginPercent: Number(marginPercent.toFixed(1)),
    markupPercent: Number(markupPercent.toFixed(1)),
  };
}

/**
 * Online sales payout, commission and contribution profit calculator
 * (ShopeeFood, GrabFood, GoFood, WhatsApp)
 */
export interface OnlineSalesParams {
  grossTotal: number;
  merchantDiscount: number;
  platformCommissionPercent: number; // e.g. 20 for 20%
  platformServiceFee: number;
  totalHpp: number;
}

export interface OnlineSalesResult {
  netSales: number;
  platformCommission: number;
  actualPayout: number;
  contributionProfit: number;
  contributionMarginPercent: number;
}

export function calculateOnlineSales(params: OnlineSalesParams): OnlineSalesResult {
  const {
    grossTotal,
    merchantDiscount = 0,
    platformCommissionPercent = 0,
    platformServiceFee = 0,
    totalHpp = 0,
  } = params;

  const netSales = Math.max(0, grossTotal - merchantDiscount);
  const platformCommission = Math.round((netSales * platformCommissionPercent) / 100);
  const actualPayout = Math.max(0, netSales - platformCommission - platformServiceFee);
  const contributionProfit = actualPayout - totalHpp;
  const contributionMarginPercent = actualPayout > 0 ? (contributionProfit / actualPayout) * 100 : 0;

  return {
    netSales,
    platformCommission,
    actualPayout,
    contributionProfit,
    contributionMarginPercent: Number(contributionMarginPercent.toFixed(1)),
  };
}

/**
 * Cash shift reconciliation calculation
 * Expected cash = openingCash + cashSales - cashRefunds + cashInflows - cashOutflows
 */
export function calculateShiftCash(params: {
  openingCash: number;
  cashSales: number;
  cashRefunds: number;
  cashInflows: number;
  cashOutflows: number;
  actualClosingCash?: number;
}): {
  expectedClosingCash: number;
  discrepancy: number;
} {
  const {
    openingCash = 0,
    cashSales = 0,
    cashRefunds = 0,
    cashInflows = 0,
    cashOutflows = 0,
    actualClosingCash,
  } = params;

  const expectedClosingCash = openingCash + cashSales - cashRefunds + cashInflows - cashOutflows;
  const discrepancy = actualClosingCash !== undefined ? actualClosingCash - expectedClosingCash : 0;

  return {
    expectedClosingCash,
    discrepancy,
  };
}

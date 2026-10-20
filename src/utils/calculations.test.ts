import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  calculateCashChange,
  convertUnit,
  calculateRecipeTotals,
  calculateProfitMargins,
  calculateOnlineSales,
  calculateShiftCash,
} from './calculations.ts';

test('calculateCartTotals computes subtotal, discount, and tax correctly', () => {
  const result = calculateCartTotals({
    items: [
      { price: 18000, quantity: 2, hpp: 6500 }, // Kopi Susu Aren x2 = 36.000
      { price: 22000, quantity: 1, hpp: 8000 }, // Matcha Latte x1 = 22.000
    ],
    discountAmount: 5000,
    taxEnabled: true,
    taxPercentage: 10,
  });

  assert.equal(result.subtotal, 58000);
  assert.equal(result.discount, 5000);
  assert.equal(result.subtotalAfterDiscount, 53000);
  assert.equal(result.tax, 5300); // 10% of 53.000
  assert.equal(result.grossTotal, 58300);
  assert.equal(result.totalHpp, 21000); // 6500*2 + 8000
  assert.equal(result.estimatedGrossProfit, 32000); // 53000 - 21000
});

test('calculateCashChange handles sufficient and insufficient cash', () => {
  const sufficient = calculateCashChange(45000, 50000);
  assert.equal(sufficient.isSufficient, true);
  assert.equal(sufficient.change, 5000);
  assert.equal(sufficient.shortage, 0);

  const insufficient = calculateCashChange(50000, 40000);
  assert.equal(insufficient.isSufficient, false);
  assert.equal(insufficient.change, 0);
  assert.equal(insufficient.shortage, 10000);
});

test('convertUnit converts between grams/kg and ml/liters', () => {
  assert.equal(convertUnit(1.5, 'kg', 'gram'), 1500);
  assert.equal(convertUnit(250, 'gram', 'kg'), 0.25);
  assert.equal(convertUnit(1, 'liter', 'ml'), 1000);
  assert.equal(convertUnit(200, 'ml', 'liter'), 0.2);
});

test('calculateRecipeTotals correctly tallies ingredient and packaging costs', () => {
  const items = [
    { quantity: 18, unitCost: 150, isPackaging: false }, // 18g espresso = Rp 2.700
    { quantity: 120, unitCost: 20, isPackaging: false }, // 120ml milk = Rp 2.400
    { quantity: 25, unitCost: 28, isPackaging: false },  // 25ml aren = Rp 700
    { quantity: 1, unitCost: 850, isPackaging: true },   // Cup 16oz + seal = Rp 850
    { quantity: 1, unitCost: 150, isPackaging: true },   // Paper straw = Rp 150
  ];

  const result = calculateRecipeTotals(items);
  assert.equal(result.ingredientCost, 5800);
  assert.equal(result.packagingCost, 1000);
  assert.equal(result.totalHpp, 6800);
});

test('calculateProfitMargins calculates gross profit, margin %, and markup %', () => {
  const result = calculateProfitMargins(20000, 8000);
  assert.equal(result.grossProfit, 12000);
  assert.equal(result.marginPercent, 60.0); // 12000 / 20000
  assert.equal(result.markupPercent, 150.0); // 12000 / 8000
});

test('calculateOnlineSales correctly accounts for platform commissions and net payout', () => {
  const result = calculateOnlineSales({
    grossTotal: 100000,
    merchantDiscount: 10000, // Net sales = 90.000
    platformCommissionPercent: 20, // 20% of 90.000 = 18.000
    platformServiceFee: 1000,
    totalHpp: 35000,
  });

  assert.equal(result.netSales, 90000);
  assert.equal(result.platformCommission, 18000);
  assert.equal(result.actualPayout, 71000); // 90000 - 18000 - 1000
  assert.equal(result.contributionProfit, 36000); // 71000 - 35000
});

test('calculateShiftCash reconciles cash and detects discrepancy', () => {
  // Scenario: Opening 200.000, Cash Sales 500.000, Refund 20.000, In 50.000 (modal tambahan), Out 30.000 (beli es batu)
  // Expected = 200.000 + 500.000 - 20.000 + 50.000 - 30.000 = 700.000
  const result = calculateShiftCash({
    openingCash: 200000,
    cashSales: 500000,
    cashRefunds: 20000,
    cashInflows: 50000,
    cashOutflows: 30000,
    actualClosingCash: 695000,
  });

  assert.equal(result.expectedClosingCash, 700000);
  assert.equal(result.discrepancy, -5000); // short Rp 5.000
});

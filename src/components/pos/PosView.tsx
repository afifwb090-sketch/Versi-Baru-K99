import React, { useState, useEffect } from 'react';
import { Product, ProductVariant, ProductAddon, Order, PaymentMethod } from '../../types/database';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah } from '../../utils/formatters';
import { calculateCartTotals, calculateCashChange } from '../../utils/calculations';
import { ReceiptModal } from './ReceiptModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  QrCode,
  Banknote,
  CreditCard,
  Building2,
  Clock,
  History,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface CartItem {
  id: string; // unique cart row id
  product: Product;
  variant?: ProductVariant;
  addons: ProductAddon[];
  quantity: number;
  unitPrice: number;
  unitHpp: number;
  notes: string;
}

export const PosView: React.FC = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(dataService.getSettings());

  const [categories, setCategories] = useState(dataService.getCategories());
  const [products, setProducts] = useState(dataService.getProducts(true));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Pelanggan Walk-In');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [taxEnabled, setTaxEnabled] = useState(settings.tax_enabled);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [itemNote, setItemNote] = useState('');

  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Void / Refund Modal
  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [returnStock, setReturnStock] = useState(true);

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setSettings(dataService.getSettings());
      setProducts(dataService.getProducts(true));
      setCategories(dataService.getCategories());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.is_offline_available) return false;
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Calculate cart totals
  const calculationItems = cartItems.map((item) => ({
    price: item.unitPrice,
    quantity: item.quantity,
    hpp: item.unitHpp,
  }));

  const cartTotals = calculateCartTotals({
    items: calculationItems,
    discountAmount: appliedPromo?.discount || 0,
    taxEnabled,
    taxPercentage: settings.tax_percentage,
    serviceChargePercentage: settings.service_charge_percentage,
  });

  const cashChange = calculateCashChange(cartTotals.grossTotal, cashReceivedInput);

  // Add product to cart handler
  const handleProductClick = (product: Product) => {
    if ((product.variants && product.variants.length > 0) || (product.addons && product.addons.length > 0)) {
      setCustomizingProduct(product);
      setSelectedVariant(product.variants[0] || null);
      setSelectedAddons([]);
      setItemNote('');
    } else {
      addToCartDirect(product);
    }
  };

  const addToCartDirect = (
    product: Product,
    variant?: ProductVariant,
    addons: ProductAddon[] = [],
    note: string = ''
  ) => {
    const variantPrice = variant ? variant.price_offline : product.price_offline;
    const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = variantPrice + addonsPrice;

    const variantHpp = variant?.estimated_hpp || product.estimated_hpp;
    const addonsHpp = addons.reduce((sum, a) => sum + a.estimated_hpp, 0);
    const unitHpp = variantHpp + addonsHpp;

    const rowId = `${product.id}-${variant?.id || 'std'}-${addons.map((a) => a.id).sort().join('-')}-${note}`;

    const existingIndex = cartItems.findIndex((i) => i.id === rowId);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          id: rowId,
          product,
          variant,
          addons,
          quantity: 1,
          unitPrice,
          unitHpp,
          notes: note,
        },
      ]);
    }
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    addToCartDirect(customizingProduct, selectedVariant || undefined, selectedAddons, itemNote);
    setCustomizingProduct(null);
  };

  const updateQuantity = (rowId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === rowId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (rowId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== rowId));
  };

  // Quick cash setters
  const setCashExact = () => setCashReceivedInput(cartTotals.grossTotal);
  const setCash20k = () => setCashReceivedInput(20000);
  const setCash50k = () => setCashReceivedInput(50000);
  const setCash100k = () => setCashReceivedInput(100000);

  // Apply promo coupon
  const handleApplyPromo = () => {
    setPromoError('');
    if (!promoCodeInput.trim()) return;
    const code = promoCodeInput.trim().toUpperCase();
    const promo = dataService.getPromotions().find((p) => p.code === code && p.is_active);

    if (!promo) {
      setPromoError('Kode promo tidak valid atau kadaluarsa');
      return;
    }
    if (cartTotals.subtotal < promo.minimum_order_amount) {
      setPromoError(`Minimal belanja ${formatRupiah(promo.minimum_order_amount)}`);
      return;
    }

    let discount = 0;
    if (promo.discount_type === 'fixed') {
      discount = promo.discount_value;
    } else {
      discount = Math.round((cartTotals.subtotal * promo.discount_value) / 100);
      if (promo.maximum_discount && discount > promo.maximum_discount) {
        discount = promo.maximum_discount;
      }
    }
    setAppliedPromo({ code: promo.code, discount });
  };

  // Complete POS transaction
  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;
    if (paymentMethod === 'tunai' && !cashChange.isSufficient) {
      alert(`Uang tunai kurang sebesar ${formatRupiah(cashChange.shortage)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const activeShift = dataService.getActiveShift();
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `${settings.order_prefix_offline}-${datePart}-${randomSuffix}`;

      const orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
        order_number: orderNumber,
        channel: 'pos_offline',
        customer_name: customerName.trim() || 'Pelanggan Walk-In',
        order_type: orderType,
        status: 'selesai',
        payment_status: 'dibayar',
        payment_method: paymentMethod,
        subtotal_amount: cartTotals.subtotal,
        discount_amount: cartTotals.discount,
        discount_description: appliedPromo?.code,
        tax_amount: cartTotals.tax,
        service_charge: cartTotals.serviceCharge,
        delivery_fee: 0,
        gross_total: cartTotals.grossTotal,
        platform_commission: 0,
        platform_service_fee: 0,
        actual_payout: cartTotals.grossTotal,
        total_hpp: cartTotals.totalHpp,
        gross_profit: cartTotals.estimatedGrossProfit,
        cash_received: paymentMethod === 'tunai' ? cashReceivedInput : cartTotals.grossTotal,
        cash_change: paymentMethod === 'tunai' ? cashChange.change : 0,
        cashier_name: currentUser.full_name,
        shift_id: activeShift?.id,
        paid_at: now.toISOString(),
        items: cartItems.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          order_id: '',
          product_id: item.product.id,
          product_name: item.product.name,
          variant_name: item.variant?.name,
          addons_summary: item.addons.map((a) => a.name).join(', '),
          unit_price: item.unitPrice,
          unit_hpp: item.unitHpp,
          quantity: item.quantity,
          subtotal_price: item.unitPrice * item.quantity,
          subtotal_hpp: item.unitHpp * item.quantity,
          notes: item.notes,
        })),
      };

      const savedOrder = dataService.createPosOrder(orderData);
      setCompletedOrder(savedOrder);

      // Reset cart
      setCartItems([]);
      setCustomerName('Pelanggan Walk-In');
      setAppliedPromo(null);
      setPromoCodeInput('');
      setCashReceivedInput(0);
    } catch (err: any) {
      alert(`Gagal memproses transaksi: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void order handler
  const handleConfirmVoid = () => {
    if (!orderToVoid || !voidReason.trim()) return;
    dataService.voidOrRefundOrder(orderToVoid.id, voidReason.trim(), currentUser.full_name, returnStock);
    setOrderToVoid(null);
    setVoidReason('');
  };

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* LEFT AREA: Product catalog & filter */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 border-r border-slate-200 overflow-hidden">
        {/* Top search & history bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu kopi, matcha, snack... (SKU / Nama)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Live Web Publik Status Pill */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                settings.is_store_open
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
              title={
                settings.is_store_open
                  ? 'Website publik sedang Buka untuk pesanan online'
                  : 'Website publik sedang Tutup'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.is_store_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>Web Publik: {settings.is_store_open ? 'Buka' : 'Tutup'}</span>
            </div>

            <button
              onClick={() => setShowHistory(true)}
              aria-label="Riwayat Transaksi POS Hari Ini"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Riwayat Struk</span>
            </button>
          </div>
        </div>

        {/* Category horizontal pills */}
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Menu ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer select-none group"
              >
                <div>
                  <div className="aspect-square w-full rounded-lg bg-slate-100 overflow-hidden mb-2 relative">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
                      {product.preparation_time_minutes}m
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{product.category_name}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-700">
                    {formatRupiah(product.price_offline)}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p>Menu tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Touch-friendly POS Cart & Payment Panel */}
      <div className="w-full xl:w-96 2xl:w-[420px] bg-white flex flex-col border-t xl:border-t-0 xl:border-l border-slate-200 shadow-lg">
        {/* Cart Header */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm tracking-tight">Pesanan Kasir</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/40 text-blue-300 border border-blue-500/30">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} item
            </span>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={() => setCartItems([])}
              className="text-xs text-red-300 hover:text-white transition"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Order details controls (Customer & Type) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Nama / No. Meja</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Meja 03 / Mas Dimas"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Tipe Order</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`py-1 text-[11px] font-semibold rounded-md transition ${
                  orderType === 'dine_in' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Dine In
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`py-1 text-[11px] font-semibold rounded-md transition ${
                  orderType === 'takeaway' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Bungkus
              </button>
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 leading-tight">
                    {item.product.name}
                  </h4>
                  {item.variant && (
                    <span className="text-[10px] font-medium text-blue-600 mr-1.5">
                      [{item.variant.name}]
                    </span>
                  )}
                  {item.addons.length > 0 && (
                    <div className="text-[10px] text-slate-500">
                      +{item.addons.map((a) => a.name).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-[10px] text-slate-400 italic">*{item.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs text-slate-900">
                    {formatRupiah(item.unitPrice * item.quantity)}
                  </span>
                  <div className="text-[10px] text-slate-400">
                    @{formatRupiah(item.unitPrice)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <button
                  onClick={() => removeCartItem(item.id)}
                  aria-label="Hapus Item"
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-0.5 text-slate-600 hover:text-blue-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-0.5 text-slate-600 hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cartItems.length === 0 && (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <p>Keranjang masih kosong</p>
              <p className="text-[10px] text-slate-400 mt-1">Pilih menu dari katalog di sebelah kiri</p>
            </div>
          )}
        </div>

        {/* Promo code & tax toggle */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Kode Kupon / Promo"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg uppercase font-mono text-xs"
            />
            <button
              onClick={handleApplyPromo}
              className="px-3 py-1 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition"
            >
              Gunakan
            </button>
          </div>
          {promoError && <p className="text-[10px] text-red-600 font-medium">{promoError}</p>}
          {appliedPromo && (
            <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-semibold border border-emerald-200">
              <span>Promo {appliedPromo.code}: -{formatRupiah(appliedPromo.discount)}</span>
              <button onClick={() => setAppliedPromo(null)} className="text-emerald-900 hover:text-red-600">×</button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-600">Pajak Restoran PB1 ({settings.tax_percentage}%)</span>
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer"
            />
          </div>
        </div>

        {/* Payment selector & Cash keypad */}
        <div className="p-3 bg-white border-t border-slate-200 space-y-2.5">
          {/* Method selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'tunai', label: 'Tunai', icon: Banknote },
              { id: 'qris', label: 'QRIS', icon: QrCode },
              { id: 'transfer_bank', label: 'Transfer', icon: Building2 },
              { id: 'debit', label: 'Debit', icon: CreditCard },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setPaymentMethod(m.id as PaymentMethod);
                    if (m.id === 'tunai') setCashReceivedInput(cartTotals.grossTotal);
                  }}
                  className={`py-1.5 flex flex-col items-center justify-center rounded-lg border text-[11px] font-semibold transition ${
                    isSelected
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash received calculator (if Tunai) */}
          {paymentMethod === 'tunai' && (
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Uang Diterima:</span>
                <input
                  type="number"
                  value={cashReceivedInput || ''}
                  onChange={(e) => setCashReceivedInput(Number(e.target.value))}
                  className="w-32 px-2 py-1 text-right font-bold text-sm bg-white border border-slate-300 rounded-lg"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={setCashExact}
                  className="py-1 text-[10px] font-semibold rounded bg-white border border-slate-200 hover:bg-slate-100"
                >
                  Uang Pas
                </button>
                <button
                  onClick={setCash20k}
                  className="py-1 text-[10px] font-semibold rounded bg-white border border-slate-200 hover:bg-slate-100"
                >
                  20.000
                </button>
                <button
                  onClick={setCash50k}
                  className="py-1 text-[10px] font-semibold rounded bg-white border border-slate-200 hover:bg-slate-100"
                >
                  50.000
                </button>
                <button
                  onClick={setCash100k}
                  className="py-1 text-[10px] font-semibold rounded bg-white border border-slate-200 hover:bg-slate-100"
                >
                  100.000
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-600">Kembalian:</span>
                <span className={`font-bold ${cashChange.isSufficient ? 'text-emerald-600' : 'text-red-500'}`}>
                  {cashChange.isSufficient ? formatRupiah(cashChange.change) : `Kurang ${formatRupiah(cashChange.shortage)}`}
                </span>
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>{formatRupiah(cartTotals.subtotal)}</span>
            </div>
            {cartTotals.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon:</span>
                <span>-{formatRupiah(cartTotals.discount)}</span>
              </div>
            )}
            {cartTotals.tax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Pajak Resto ({settings.tax_percentage}%):</span>
                <span>{formatRupiah(cartTotals.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-base text-slate-900 pt-1 border-t border-slate-100">
              <span>TOTAL BAYAR:</span>
              <span className="text-blue-700">{formatRupiah(cartTotals.grossTotal)}</span>
            </div>
          </div>

          {/* Process Payment Button */}
          <button
            onClick={handleCompleteSale}
            disabled={cartItems.length === 0 || isSubmitting || (paymentMethod === 'tunai' && !cashChange.isSufficient)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <Banknote className="w-4 h-4" />
            <span>
              {isSubmitting ? 'Memproses...' : `Bayar ${formatRupiah(cartTotals.grossTotal)}`}
            </span>
          </button>
        </div>
      </div>

      {/* PRODUCT CUSTOMIZATION MODAL */}
      {customizingProduct && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{customizingProduct.name}</h3>
                <p className="text-xs text-slate-400">{formatRupiah(customizingProduct.price_offline)}</p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Variants */}
              {customizingProduct.variants && customizingProduct.variants.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">Pilih Varian (Suhu / Ukuran)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingProduct.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                          selectedVariant?.id === v.id
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>{v.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRupiah(v.price_offline)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {customizingProduct.addons && customizingProduct.addons.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">Tambahan (Add-on)</label>
                  <div className="space-y-1.5">
                    {customizingProduct.addons.map((addon) => {
                      const isChecked = selectedAddons.some((a) => a.id === addon.id);
                      return (
                        <label
                          key={addon.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAddons([...selectedAddons, addon]);
                                } else {
                                  setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
                                }
                              }}
                              className="rounded text-blue-600 border-slate-300"
                            />
                            <span>{addon.name}</span>
                          </div>
                          <span className="font-semibold text-slate-600">+{formatRupiah(addon.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Note */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Pesanan</label>
                <input
                  type="text"
                  placeholder="Contoh: Less sugar, extra ice, gula pisah"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCustomization}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Tambahkan ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          settings={settings}
          onClose={() => setCompletedOrder(null)}
        />
      )}

      {/* POS TRANSACTION HISTORY DRAWER & VOID MODAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Riwayat Transaksi Kasir</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {dataService.getOrders().slice(0, 30).map((ord) => (
                <div
                  key={ord.id}
                  className={`p-3 rounded-xl border text-xs flex flex-col gap-2 ${
                    ord.status === 'dibatalkan'
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{ord.order_number}</div>
                      <div className="text-[10px] text-slate-500">{ord.customer_name} • {ord.channel}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-blue-700">{formatRupiah(ord.gross_total)}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ord.status === 'selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ord.status === 'selesai' ? 'Selesai' : 'Dibatalkan / Void'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 line-clamp-1 border-t border-slate-100 pt-1.5">
                    {ord.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 uppercase">{ord.payment_method}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCompletedOrder(ord);
                          setShowHistory(false);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700"
                      >
                        Cetak Ulang
                      </button>
                      {ord.status !== 'dibatalkan' && (
                        <button
                          onClick={() => setOrderToVoid(ord)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-md font-semibold text-red-700"
                        >
                          Void / Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VOID CONFIRMATION MODAL WITH MANDATORY REASON */}
      {orderToVoid && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Otorisasi Void / Pembatalan Struk</h3>
            </div>

            <p className="text-xs text-slate-600">
              Anda akan membatalkan transaksi <strong>{orderToVoid.order_number}</strong> senilai{' '}
              <strong>{formatRupiah(orderToVoid.gross_total)}</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alasan Pembatalan (Wajib Diisi):
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Pelanggan salah pesan, pesanan batal dibuat, salah nominal..."
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={returnStock}
                onChange={(e) => setReturnStock(e.target.checked)}
                className="rounded text-red-600 border-slate-300"
              />
              <span>Kembalikan bahan baku resep ke stok gudang</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setOrderToVoid(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={!voidReason.trim()}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-slate-300 text-white rounded-xl shadow-xs"
              >
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

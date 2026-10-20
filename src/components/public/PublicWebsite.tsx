import React, { useState, useEffect } from 'react';
import { Product, ProductVariant, ProductAddon, Order, BusinessSettings } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import { calculateCartTotals } from '../../utils/calculations';
import { generateWhatsAppOrderMessage, buildWhatsAppLink } from '../../utils/whatsapp';
import {
  Coffee,
  ShoppingBag,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Heart,
  Search,
  X,
  ExternalLink,
  Store,
  AlertCircle,
  AlertTriangle,
  Power,
} from 'lucide-react';

interface PublicCartItem {
  rowId: string;
  product: Product;
  variant?: ProductVariant;
  addons: ProductAddon[];
  quantity: number;
  unitPrice: number;
  notes: string;
}

export const PublicWebsite: React.FC<{ onReturnToAdmin: () => void }> = ({ onReturnToAdmin }) => {
  const [settings, setSettings] = useState<BusinessSettings>(dataService.getSettings());
  const [products, setProducts] = useState<Product[]>(
    dataService.getProducts(true).filter((p) => p.is_online_available)
  );
  const categories = dataService.getCategories();

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setSettings(dataService.getSettings());
      setProducts(dataService.getProducts(true).filter((p) => p.is_online_available));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'cart' | 'success'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cartItems, setCartItems] = useState<PublicCartItem[]>([]);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Customization Modal
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [itemNote, setItemNote] = useState('');

  // Completed Order State for Success Screen
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>('');

  // Calculation items
  const calculationItems = cartItems.map((item) => ({
    price: item.unitPrice,
    quantity: item.quantity,
  }));
  const cartTotals = calculateCartTotals({
    items: calculationItems,
    deliveryFee: orderType === 'delivery' ? 5000 : 0,
  });

  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenCustomize = (product: Product) => {
    setCustomizingProduct(product);
    setSelectedVariant(product.variants[0] || null);
    setSelectedAddons([]);
    setItemNote('');
  };

  const handleAddToCart = () => {
    if (!customizingProduct) return;
    const variantPrice = selectedVariant ? selectedVariant.price_online : customizingProduct.price_online;
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = variantPrice + addonsPrice;

    const rowId = `${customizingProduct.id}-${selectedVariant?.id || 'std'}-${selectedAddons.map((a) => a.id).sort().join('-')}-${itemNote}`;

    const existingIdx = cartItems.findIndex((i) => i.rowId === rowId);
    if (existingIdx >= 0) {
      const updated = [...cartItems];
      updated[existingIdx].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          rowId,
          product: customizingProduct,
          variant: selectedVariant || undefined,
          addons: selectedAddons,
          quantity: 1,
          unitPrice,
          notes: itemNote,
        },
      ]);
    }
    setCustomizingProduct(null);
  };

  const updateCartQty = (rowId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.rowId === rowId) {
            const n = i.quantity + delta;
            return n > 0 ? { ...i, quantity: n } : null;
          }
          return i;
        })
        .filter(Boolean) as PublicCartItem[]
    );
  };

  // Store Open / Closed Status Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggleStoreOpen = () => {
    const nextState = !settings.is_store_open;
    dataService.updateSettings({ is_store_open: nextState });
    setToastMessage(
      nextState
        ? 'Status Diperbarui: KEDAI SEKARANG BUKA! Pelanggan dapat memesan secara online.'
        : 'Status Diperbarui: KEDAI SEKARANG TUTUP. Pemesanan online dinonaktifkan sementara.'
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  // WhatsApp Checkout Handler
  const handleCheckoutWhatsApp = () => {
    if (!settings.is_store_open) {
      alert(
        settings.store_closed_message ||
          'Mohon maaf, Kopi 99 Warungboto saat ini sedang TUTUP. Pemesanan online belum dapat diproses.'
      );
      return;
    }
    if (cartItems.length === 0) return;
    if (!custName.trim() || !custPhone.trim()) {
      alert('Mohon lengkapi Nama dan Nomor WhatsApp Anda.');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      alert('Mohon masukkan Alamat Pengiriman untuk pesanan delivery.');
      return;
    }

    // Generate unique order number
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `${settings.order_prefix_online}-${datePart}-${randomSuffix}`;

    const newOrder: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
      order_number: orderNumber,
      channel: 'whatsapp',
      customer_name: custName.trim(),
      customer_phone: custPhone.trim(),
      customer_address: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
      order_type: orderType,
      status: 'menunggu_konfirmasi',
      payment_status: 'belum_bayar',
      subtotal_amount: cartTotals.subtotal,
      discount_amount: 0,
      tax_amount: 0,
      service_charge: 0,
      delivery_fee: orderType === 'delivery' ? 5000 : 0,
      gross_total: cartTotals.grossTotal,
      platform_commission: 0,
      platform_service_fee: 0,
      actual_payout: cartTotals.grossTotal,
      total_hpp: cartItems.reduce((acc, i) => acc + (i.product.estimated_hpp * i.quantity), 0),
      gross_profit: cartTotals.grossTotal - cartItems.reduce((acc, i) => acc + (i.product.estimated_hpp * i.quantity), 0),
      notes: orderNotes.trim() || undefined,
      items: cartItems.map((item, idx) => ({
        id: `oi-${Date.now()}-${idx}`,
        order_id: '',
        product_id: item.product.id,
        product_name: item.product.name,
        variant_name: item.variant?.name,
        addons_summary: item.addons.map((a) => a.name).join(', '),
        unit_price: item.unitPrice,
        unit_hpp: item.product.estimated_hpp,
        quantity: item.quantity,
        subtotal_price: item.unitPrice * item.quantity,
        subtotal_hpp: item.product.estimated_hpp * item.quantity,
        notes: item.notes,
      })),
    };

    // Save order as pending
    const saved = dataService.createPosOrder(newOrder);

    // Build WhatsApp message & link
    const waMessage = generateWhatsAppOrderMessage(saved, settings);
    const waLink = buildWhatsAppLink(settings.whatsapp_number, waMessage);

    setSubmittedOrder(saved);
    setLastWhatsAppUrl(waLink);
    setActiveTab('success');

    // Open WhatsApp in new window
    window.open(waLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* PUBLIC HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center font-bold text-base text-white shadow-md">
              99
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight block leading-none">{settings.business_name}</span>
                {/* Store Status Pill in Header */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    settings.is_store_open
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                      : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                  }`}
                  title={settings.is_store_open ? `Kedai Buka: ${settings.opening_hours}` : 'Kedai Sedang Tutup'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.is_store_open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span>{settings.is_store_open ? 'BUKA' : 'TUTUP'}</span>
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-medium">Kopi & Matcha Warungboto</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Toggle Store Status for Staff / Demo */}
            <button
              onClick={handleToggleStoreOpen}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                settings.is_store_open
                  ? 'bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-600'
                  : 'bg-emerald-900/60 hover:bg-emerald-850 text-emerald-300 border-emerald-600 shadow-sm'
              }`}
              title={
                settings.is_store_open
                  ? 'Ubah status menjadi TUTUP untuk pelanggan online'
                  : 'Ubah status menjadi BUKA untuk menerima pesanan online'
              }
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{settings.is_store_open ? 'Tutup Kedai' : 'Buka Kedai'}</span>
            </button>

            <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('home')}
                className={`transition ${activeTab === 'home' ? 'text-blue-400' : 'text-slate-300 hover:text-white'}`}
              >
                Beranda
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`transition ${activeTab === 'menu' ? 'text-blue-400' : 'text-slate-300 hover:text-white'}`}
              >
                Katalog Menu
              </button>
            </nav>

            {/* Cart Button */}
            <button
              onClick={() => setActiveTab('cart')}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Keranjang</span>
              {totalCartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Back to Admin Mode */}
            <button
              onClick={onReturnToAdmin}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition"
              title="Masuk ke Panel POS Kasir / Admin"
            >
              Admin POS
            </button>
          </div>
        </div>
      </header>

      {/* FLOATING TOAST NOTIFICATION ON TOGGLE */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs max-w-md animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold leading-snug">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GLOBAL BANNER: STORE CLOSED NOTICE */}
      {!settings.is_store_open && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 text-white px-4 py-3 border-b border-rose-800/80 shadow-inner">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-800/80 border border-rose-600/50 flex items-center justify-center shrink-0 shadow-xs">
                <Store className="w-5 h-5 text-rose-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    MOHON MAAF, KEDAI SAAT INI SEDANG TUTUP
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-900 text-rose-200 border border-rose-700">
                    Buka: {settings.opening_hours}
                  </span>
                </div>
                <p className="text-xs text-rose-200 mt-0.5 leading-relaxed">
                  {settings.store_closed_message ||
                    'Mohon maaf, Kopi 99 Warungboto saat ini sedang TUTUP. Kami buka kembali setiap hari pukul 08:00 - 23:00 WIB.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
                  'Halo Kopi 99 Warungboto, saya ingin bertanya jam buka kedai / ketersediaan menu.'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tanya Barista</span>
              </a>
              <button
                onClick={handleToggleStoreOpen}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1"
                title="Buka kedai sekarang"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Buka Kedai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL BANNER: STORE OPEN NOTICE */}
      {settings.is_store_open && (
        <div className="bg-emerald-950 text-emerald-200 px-4 py-1.5 border-b border-emerald-900/60 text-xs text-center flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">
            Kedai Sedang BUKA ({settings.opening_hours}) — Melayani Dine-in, Pickup & Pesanan Online Delivery Warungboto
          </span>
        </div>
      )}

      {/* VIEW: HOME LANDING PAGE */}
      {activeTab === 'home' && (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-slate-900 text-white py-14 sm:py-20 px-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="max-w-4xl mx-auto text-center relative z-10 space-y-5">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Warungboto, Umbulharjo, Yogyakarta</span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    settings.is_store_open
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.is_store_open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span>
                    {settings.is_store_open
                      ? `Buka Sekarang • ${settings.opening_hours}`
                      : `Sedang Tutup • Buka ${settings.opening_hours}`}
                  </span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Kopi & Matcha Kekinian <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                  Kopi 99 Warungboto
                </span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                Racikan espresso house blend lokal Merapi, gula aren organik Kulon Progo, dan matcha ceremonial Uji Jepang asli. Segar, creamy, dan pas untuk santai.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setActiveTab('menu')}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <span>{settings.is_store_open ? 'Pesan Sekarang' : 'Lihat Katalog Menu'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
                    settings.is_store_open
                      ? 'Halo Kopi 99 Warungboto, saya ingin bertanya tentang menu.'
                      : 'Halo Kopi 99 Warungboto, apakah kedai sedang buka atau kapan mulai buka?'
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat WhatsApp</span>
                </a>
              </div>
            </div>
          </section>

          {/* Quick Info Bar with Live Status */}
          <section className="bg-white border-y border-slate-200 py-4 px-4">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <Clock className={`w-5 h-5 shrink-0 ${settings.is_store_open ? 'text-emerald-600' : 'text-rose-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 block">Jam Operasional</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        settings.is_store_open
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {settings.is_store_open ? '● BUKA SEKARANG' : '● SEDANG TUTUP'}
                    </span>
                  </div>
                  <span className="text-slate-600">{settings.opening_hours}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">Lokasi Kedai</span>
                  <span className="truncate">{settings.address}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">WhatsApp Pemesanan</span>
                  <span>{settings.whatsapp_number}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Menu & Best Sellers */}
          <section className="py-12 px-4 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Menu Favorit Kopi 99
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Paling laris dan direkomendasikan barista untuk kamu
                </p>
              </div>

              <button
                onClick={() => setActiveTab('menu')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Lihat Semua Menu</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {products.slice(0, 3).map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      {prod.category_name}
                    </span>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{prod.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-sm text-blue-700">
                        {formatRupiah(prod.price_online)}
                      </span>
                      <button
                        onClick={() => handleOpenCustomize(prod)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition ${
                          settings.is_store_open
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        {settings.is_store_open ? '+ Pesan' : 'Lihat Detail'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Store Location Map & Social Footer */}
          <section className="bg-slate-100 py-10 px-4 border-t border-slate-200">
            <div className="max-w-4xl mx-auto text-center space-y-3">
              <h3 className="font-bold text-base text-slate-900">Kopi 99 Warungboto, Yogyakarta</h3>
              <p className="text-xs text-slate-600">{settings.address}</p>
              <div className="flex justify-center gap-3 pt-2">
                <a
                  href={settings.google_maps_url || 'https://maps.google.com/?q=Warungboto+Yogyakarta'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>Buka di Google Maps</span>
                </a>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* VIEW: FULL MENU CATALOG */}
      {activeTab === 'menu' && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Katalog Menu Online</h1>
              <p className="text-xs sm:text-sm text-slate-500">Pilih minuman & camilan favoritmu untuk pickup atau delivery</p>
            </div>

            <div
              className={`self-start sm:self-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
                settings.is_store_open
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  settings.is_store_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{settings.is_store_open ? 'Kedai Buka — Siap Melayani Pesanan' : 'Kedai Sedang Tutup'}</span>
            </div>
          </div>

          {!settings.is_store_open && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-950 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm">Kedai Kopi 99 Sedang Tutup Saat Ini</div>
                <p className="text-amber-900 leading-relaxed">
                  {settings.store_closed_message ||
                    'Mohon maaf, Kopi 99 Warungboto saat ini sedang TUTUP. Kami buka kembali setiap hari pukul 08:00 - 23:00 WIB.'}
                </p>
                <p className="text-amber-800 text-[11px]">
                  Anda tetap dapat menjelajahi seluruh menu, varian rasa, dan harga di bawah ini. Pemesanan via WhatsApp dapat dikirim setelah kedai kembali buka pukul {settings.opening_hours}.
                </p>
              </div>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kopi susu, matcha latte, aren..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua Menu
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3 shadow-xs hover:shadow-md transition cursor-pointer select-none"
                onClick={() => handleOpenCustomize(prod)}
              >
                <img
                  src={prod.image_url}
                  alt={prod.name}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900">{prod.name}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{prod.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                    <span className="font-extrabold text-xs text-blue-700">
                      {formatRupiah(prod.price_online)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCustomize(prod);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        settings.is_store_open
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {settings.is_store_open ? '+ Tambah' : 'Lihat Detail'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW: CART & CHECKOUT WITH WHATSAPP */}
      {activeTab === 'cart' && (
        <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <span>Keranjang & Checkout Pemesanan</span>
            </h1>
            <button onClick={() => setActiveTab('menu')} className="text-xs font-semibold text-blue-600 hover:underline">
              + Tambah Menu Lain
            </button>
          </div>

          {/* Cart items list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 divide-y divide-slate-100 shadow-xs">
            {cartItems.map((item) => (
              <div key={item.rowId} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900">{item.product.name}</h4>
                  {item.variant && (
                    <span className="text-[10px] text-blue-600 font-semibold mr-1">
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
                  <div className="text-[11px] font-bold text-blue-700 mt-1">
                    {formatRupiah(item.unitPrice * item.quantity)}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                  <button onClick={() => updateCartQty(item.rowId, -1)} className="p-0.5 text-slate-600">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQty(item.rowId, 1)} className="p-0.5 text-slate-600">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cartItems.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Keranjang Anda masih kosong. Pilih menu di katalog untuk memesan.
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <>
              {/* Customer Contact Form */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-xs shadow-xs">
                <h3 className="font-bold text-sm text-slate-900">Informasi Pemesan</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap (Wajib)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Dimas Wicaksono"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp Aktif (Wajib)</label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Metode Pengambilan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('pickup')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        orderType === 'pickup'
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Ambil di Toko (Pickup Warungboto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        orderType === 'delivery'
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Kirim ke Lokasi (Delivery +Rp 5.000)
                    </button>
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Alamat Pengiriman</label>
                    <textarea
                      rows={2}
                      placeholder="Alamat lengkap, patokan, no rumah..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan untuk Barista</label>
                  <input
                    type="text"
                    placeholder="Contoh: Tolong minta es batu dipisah di plastik terpisah..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Payment Summary Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg space-y-3 text-xs">
                <h3 className="font-bold text-sm text-amber-400">Ringkasan Pembayaran</h3>

                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal Pesanan:</span>
                    <span>{formatRupiah(cartTotals.subtotal)}</span>
                  </div>
                  {orderType === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Ongkos Kirim (Delivery):</span>
                      <span>{formatRupiah(5000)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-base text-white pt-2 border-t border-slate-800">
                    <span>ESTIMASI TOTAL:</span>
                    <span className="text-amber-400">{formatRupiah(cartTotals.grossTotal)}</span>
                  </div>
                </div>

                {!settings.is_store_open ? (
                  <div className="space-y-3 pt-2">
                    <div className="p-3.5 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-200 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>KEDAI SAAT INI SEDANG TUTUP</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {settings.store_closed_message ||
                          'Mohon maaf, Kopi 99 Warungboto saat ini sedang TUTUP. Kami buka kembali setiap hari pukul 08:00 - 23:00 WIB.'}
                      </p>
                      <div className="text-[10px] text-slate-300 pt-1">
                        Pemesanan online via WhatsApp dinonaktifkan sementara hingga kedai kembali buka.
                      </div>
                    </div>

                    <button
                      disabled
                      className="w-full py-3.5 bg-slate-800 text-slate-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700"
                    >
                      <Store className="w-5 h-5 text-rose-400" />
                      <span>Kedai Sedang Tutup — Pemesanan Dinonaktifkan</span>
                    </button>

                    <a
                      href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
                        `Halo Kopi 99 Warungboto, saya ingin bertanya apakah bisa memesan untuk jam buka nanti (${settings.opening_hours})?`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Tanya Barista via WhatsApp</span>
                    </a>

                    <div className="text-center pt-1">
                      <button
                        onClick={handleToggleStoreOpen}
                        className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        [Admin / Kasir: Klik di sini untuk BUKA kedai sekarang]
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleCheckoutWhatsApp}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Kirim Pesanan ke WhatsApp Kopi 99</span>
                    </button>

                    <p className="text-[11px] text-slate-400 text-center">
                      Setelah klik, Anda akan diarahkan ke WhatsApp resmi Kopi 99 Warungboto untuk konfirmasi pesanan & instruksi pembayaran QRIS / Transfer.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      )}

      {/* VIEW: ORDER SUCCESS CONFIRMATION */}
      {activeTab === 'success' && submittedOrder && (
        <main className="flex-1 max-w-lg w-full mx-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-black text-slate-900">Pesanan Berhasil Disimpan!</h1>
          <p className="text-xs text-slate-600 max-w-sm">
            Nomor referensi pesanan Anda:{' '}
            <strong className="font-mono text-blue-700 font-extrabold block text-base mt-1">
              {submittedOrder.order_number}
            </strong>
          </p>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 w-full text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Nama:</span>
              <span className="font-semibold">{submittedOrder.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Tagihan:</span>
              <span className="font-bold text-blue-700">{formatRupiah(submittedOrder.gross_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status Pesanan:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Menunggu Konfirmasi
              </span>
            </div>
          </div>

          <div className="pt-2 w-full space-y-2">
            <a
              href={lastWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Buka Chat WhatsApp Kembali</span>
            </a>

            <button
              onClick={() => {
                setCartItems([]);
                setActiveTab('home');
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Kembali ke Beranda
            </button>
          </div>
        </main>
      )}

      {/* CUSTOMIZATION MODAL */}
      {customizingProduct && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{customizingProduct.name}</h3>
                <span className="text-xs font-bold text-blue-700">
                  {formatRupiah(customizingProduct.price_online)}
                </span>
              </div>
              <button onClick={() => setCustomizingProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!settings.is_store_open && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Kedai sedang tutup ({settings.opening_hours}). Anda tetap dapat memilih varian & topping untuk melihat harga.
                </span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Variants */}
              {customizingProduct.variants && customizingProduct.variants.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Pilihan Ukuran / Suhu:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingProduct.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                          selectedVariant?.id === v.id
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>{v.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRupiah(v.price_online)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {customizingProduct.addons && customizingProduct.addons.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Tambahan (Add-on):</label>
                  <div className="space-y-1.5">
                    {customizingProduct.addons.map((ad) => {
                      const isChecked = selectedAddons.some((a) => a.id === ad.id);
                      return (
                        <label
                          key={ad.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedAddons([...selectedAddons, ad]);
                                else setSelectedAddons(selectedAddons.filter((a) => a.id !== ad.id));
                              }}
                              className="rounded text-blue-600 border-slate-300"
                            />
                            <span>{ad.name}</span>
                          </div>
                          <span className="font-bold text-slate-700">+{formatRupiah(ad.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="e.g. Less sweet, normal ice..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleAddToCart}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                {settings.is_store_open ? 'Tambahkan ke Keranjang' : 'Simpan ke Keranjang (Kedai Tutup)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

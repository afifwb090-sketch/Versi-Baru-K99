import React, { useState, useEffect } from 'react';
import { Order, OrderChannel, OrderStatus, PaymentStatus, BusinessSettings } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import { calculateOnlineSales } from '../../utils/calculations';
import {
  Bike,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Truck,
  DollarSign,
  ChevronRight,
  X,
  AlertCircle,
  Store,
  Power,
} from 'lucide-react';

export const OnlineOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(dataService.getOrders());
  const [settings, setSettings] = useState<BusinessSettings>(dataService.getSettings());
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setSettings(dataService.getSettings());
      setOrders(dataService.getOrders());
    });
    return () => {
      unsub();
    };
  }, []);

  const handleToggleStoreOpen = () => {
    const nextState = !settings.is_store_open;
    dataService.updateSettings({ is_store_open: nextState });
  };

  // New order form state
  const products = dataService.getProducts(true);
  const [newChannel, setNewChannel] = useState<OrderChannel>('shopeefood');
  const [externalId, setExternalId] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedQty, setSelectedQty] = useState(1);
  const [grossAmount, setGrossAmount] = useState(25000);
  const [merchantDiscount, setMerchantDiscount] = useState(0);
  const [platformCommissionPercent, setPlatformCommissionPercent] = useState(20);
  const [platformServiceFee, setPlatformServiceFee] = useState(1000);
  const [orderNotes, setOrderNotes] = useState('');

  const refreshOrders = () => {
    setOrders(dataService.getOrders());
  };

  const filteredOrders = orders.filter((o) => {
    if (o.channel === 'pos_offline') return false; // Only online channels
    const matchChannel = selectedChannel === 'all' || o.channel === selectedChannel;
    const matchStatus = selectedStatus === 'all' || o.status === selectedStatus;
    return matchChannel && matchStatus;
  });

  // Calculate quick summary metrics for online orders
  const totalOnlineOrders = filteredOrders.length;
  const totalGross = filteredOrders.reduce((acc, o) => acc + o.gross_total, 0);
  const totalPayout = filteredOrders.reduce((acc, o) => acc + o.actual_payout, 0);
  const totalHpp = filteredOrders.reduce((acc, o) => acc + o.total_hpp, 0);
  const totalContributionProfit = totalPayout - totalHpp;

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    dataService.updateOrderStatus(orderId, nextStatus);
    refreshOrders();
  };

  const handlePaymentStatusChange = (orderId: string, nextPayment: PaymentStatus) => {
    dataService.updateOrderStatus(orderId, undefined as any, nextPayment);
    refreshOrders();
  };

  // Add new online order
  const handleSaveOrder = () => {
    if (!custName.trim()) {
      alert('Nama pelanggan wajib diisi');
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const calc = calculateOnlineSales({
      grossTotal: grossAmount,
      merchantDiscount,
      platformCommissionPercent,
      platformServiceFee,
      totalHpp: prod.estimated_hpp * selectedQty,
    });

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = newChannel.toUpperCase().slice(0, 3);
    const orderNumber = `K99-${prefix}-${datePart}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
      order_number: orderNumber,
      external_order_id: externalId.trim() || undefined,
      channel: newChannel,
      customer_name: custName.trim(),
      customer_phone: custPhone.trim() || undefined,
      customer_address: custAddress.trim() || undefined,
      order_type: 'delivery',
      status: 'menunggu_konfirmasi',
      payment_status: newChannel === 'whatsapp' ? 'belum_bayar' : 'dibayar',
      subtotal_amount: grossAmount,
      discount_amount: merchantDiscount,
      tax_amount: 0,
      service_charge: 0,
      delivery_fee: 0,
      gross_total: grossAmount,
      platform_commission: calc.platformCommission,
      platform_service_fee: platformServiceFee,
      actual_payout: calc.actualPayout,
      total_hpp: prod.estimated_hpp * selectedQty,
      gross_profit: calc.contributionProfit,
      notes: orderNotes.trim() || undefined,
      items: [
        {
          id: `item-${Date.now()}`,
          order_id: '',
          product_id: prod.id,
          product_name: prod.name,
          unit_price: prod.price_online,
          unit_hpp: prod.estimated_hpp,
          quantity: selectedQty,
          subtotal_price: prod.price_online * selectedQty,
          subtotal_hpp: prod.estimated_hpp * selectedQty,
        },
      ],
    };

    dataService.createPosOrder(newOrder);
    refreshOrders();
    setShowAddModal(false);
  };

  const statusBadges: Record<OrderStatus, { label: string; color: string }> = {
    menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    dikonfirmasi: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    diproses: { label: 'Sedang Dibuat (Bar)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    siap_diambil: { label: 'Siap Diambil Driver', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    dalam_pengiriman: { label: 'Dalam Pengiriman', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    selesai: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    dibatalkan: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800 border-red-300' },
  };

  const channelIcons: Record<OrderChannel, { label: string; color: string }> = {
    pos_offline: { label: 'POS Offline', color: 'bg-slate-700 text-white' },
    whatsapp: { label: 'WhatsApp', color: 'bg-emerald-600 text-white' },
    shopeefood: { label: 'ShopeeFood', color: 'bg-orange-600 text-white' },
    grabfood: { label: 'GrabFood', color: 'bg-green-700 text-white' },
    gofood: { label: 'GoFood', color: 'bg-red-600 text-white' },
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="w-6 h-6 text-blue-600" />
            <span>Penjualan Online & Pesanan Masuk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola pesanan WhatsApp, ShopeeFood, GrabFood & pantau pencairan dana bersih
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Input Order Online Baru</span>
        </button>
      </div>

      {/* Store Open / Closed Status Controller for Public Website & WhatsApp */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition ${
          settings.is_store_open
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
              settings.is_store_open ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">
                Status Website Publik: {settings.is_store_open ? 'SEDANG BUKA' : 'SEDANG TUTUP'}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  settings.is_store_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings.is_store_open ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}
              >
                {settings.is_store_open ? 'Menerima Pesanan' : 'Pemesanan Ditutup'}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {settings.is_store_open
                ? `Pelanggan dapat melakukan checkout WhatsApp via website publik. Jam buka: ${settings.opening_hours}.`
                : (settings.store_closed_message || 'Kedai sedang tutup. Pemesanan publik dinonaktifkan sementara.')}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleStoreOpen}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto shrink-0 ${
            settings.is_store_open
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title={settings.is_store_open ? 'Klik untuk menutup website publik' : 'Klik untuk membuka website publik'}
        >
          <Power className="w-4 h-4" />
          <span>{settings.is_store_open ? 'Tutup Website Publik' : 'Buka Website Publik'}</span>
        </button>
      </div>

      {/* Financial Metric Cards for Online Sales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Pesanan Online</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalOnlineOrders}</div>
          <span className="text-[11px] text-slate-400">Semua kanal online</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Omzet Kotor (Gross Sales)</span>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{formatRupiah(totalGross)}</div>
          <span className="text-[11px] text-slate-400">Sebelum komisi & diskon</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Pencairan Bersih (Payout)</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{formatRupiah(totalPayout)}</div>
          <span className="text-[11px] text-slate-400">Diterima rekening K99</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Laba Kontribusi (Profit)</span>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{formatRupiah(totalContributionProfit)}</div>
          <span className="text-[11px] text-slate-400">Payout minus HPP resep</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold pr-2 border-r border-slate-200">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Kanal:</span>
        </div>
        {['all', 'whatsapp', 'shopeefood', 'grabfood', 'gofood'].map((ch) => (
          <button
            key={ch}
            onClick={() => setSelectedChannel(ch)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedChannel === ch
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {ch === 'all' ? 'Semua Kanal' : ch.toUpperCase()}
          </button>
        ))}

        <div className="flex items-center gap-1.5 text-slate-500 font-semibold pl-4 pr-2 border-l border-slate-200">
          <span>Status:</span>
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
          <option value="dikonfirmasi">Dikonfirmasi</option>
          <option value="diproses">Sedang Diproses (Bar)</option>
          <option value="siap_diambil">Siap Diambil Driver</option>
          <option value="dalam_pengiriman">Dalam Pengiriman</option>
          <option value="selesai">Selesai</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">No. Order & Kanal</th>
                <th className="py-3 px-4">Pelanggan & Alamat</th>
                <th className="py-3 px-4">Item Pesanan</th>
                <th className="py-3 px-4 text-right">Rincian Finansial</th>
                <th className="py-3 px-4">Status Pesanan</th>
                <th className="py-3 px-4">Status Bayar</th>
                <th className="py-3 px-4 text-center">Tindakan Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((ord) => {
                const ch = channelIcons[ord.channel] || channelIcons.pos_offline;
                const st = statusBadges[ord.status];
                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900">{ord.order_number}</div>
                      {ord.external_order_id && (
                        <div className="text-[10px] text-slate-400">Ext ID: {ord.external_order_id}</div>
                      )}
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${ch.color}`}>
                        {ch.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{ord.customer_name}</div>
                      {ord.customer_phone && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>{ord.customer_phone}</span>
                        </div>
                      )}
                      {ord.customer_address && (
                        <div className="text-[10px] text-slate-400 max-w-xs truncate mt-0.5">
                          {ord.customer_address}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-1">
                        {ord.items.map((i, idx) => (
                          <div key={idx} className="text-slate-700">
                            <strong>{i.quantity}x</strong> {i.product_name}
                            {i.variant_name && <span className="text-slate-400"> ({i.variant_name})</span>}
                          </div>
                        ))}
                        {ord.notes && (
                          <div className="text-[10px] text-amber-700 italic bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                            Note: {ord.notes}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900">{formatRupiah(ord.gross_total)}</div>
                      {ord.platform_commission > 0 && (
                        <div className="text-[10px] text-red-500">
                          Komisi: -{formatRupiah(ord.platform_commission)}
                        </div>
                      )}
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                        Payout: {formatRupiah(ord.actual_payout)}
                      </div>
                      <div className="text-[9px] text-indigo-500">
                        Profit: {formatRupiah(ord.gross_profit)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${st.color}`}>
                        {st.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={ord.payment_status}
                        onChange={(e) => handlePaymentStatusChange(ord.id, e.target.value as PaymentStatus)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                          ord.payment_status === 'dibayar'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="belum_bayar">Belum Bayar</option>
                        <option value="dibayar">Sudah Dibayar</option>
                        <option value="refund">Refund</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center gap-1">
                        {ord.status === 'menunggu_konfirmasi' && (
                          <button
                            onClick={() => handleStatusChange(ord.id, 'dikonfirmasi')}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold"
                          >
                            Konfirmasi
                          </button>
                        )}
                        {ord.status === 'dikonfirmasi' && (
                          <button
                            onClick={() => handleStatusChange(ord.id, 'diproses')}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold"
                          >
                            Mulai Buat
                          </button>
                        )}
                        {ord.status === 'diproses' && (
                          <button
                            onClick={() => handleStatusChange(ord.id, 'siap_diambil')}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-semibold"
                          >
                            Siap Diambil
                          </button>
                        )}
                        {ord.status === 'siap_diambil' && (
                          <button
                            onClick={() => handleStatusChange(ord.id, 'selesai')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold"
                          >
                            Selesaikan
                          </button>
                        )}
                        {ord.status !== 'selesai' && ord.status !== 'dibatalkan' && (
                          <button
                            onClick={() => handleStatusChange(ord.id, 'dibatalkan')}
                            className="px-1.5 py-1 text-red-500 hover:bg-red-50 rounded text-[10px]"
                            title="Batalkan"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Bike className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Tidak ada pesanan online pada filter ini.</p>
          </div>
        )}
      </div>

      {/* INPUT ORDER ONLINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Bike className="w-4 h-4 text-blue-600" />
                <span>Input Pesanan Online Manual</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kanal Penjualan</label>
                <select
                  value={newChannel}
                  onChange={(e) => {
                    const ch = e.target.value as OrderChannel;
                    setNewChannel(ch);
                    if (ch === 'shopeefood' || ch === 'grabfood') setPlatformCommissionPercent(20);
                    else if (ch === 'gofood') setPlatformCommissionPercent(20);
                    else setPlatformCommissionPercent(0);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="shopeefood">ShopeeFood</option>
                  <option value="grabfood">GrabFood</option>
                  <option value="gofood">GoFood</option>
                  <option value="whatsapp">WhatsApp Order</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ID Order Eksternal / Resi</label>
                <input
                  type="text"
                  placeholder="e.g. SHP-992819 atau No. WA"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Nama Pelanggan / Driver</label>
                <input
                  type="text"
                  placeholder="Nama customer"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  placeholder="0812..."
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Produk</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) setGrossAmount(p.price_online * selectedQty);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatRupiah(p.price_online)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Alamat Antar</label>
                <input
                  type="text"
                  placeholder="Jl. Warungboto No..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Total Order Bruto (Gross)</label>
                <input
                  type="number"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Diskon Ditanggung Toko</label>
                <input
                  type="number"
                  value={merchantDiscount}
                  onChange={(e) => setMerchantDiscount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Komisi Platform (%)</label>
                <input
                  type="number"
                  value={platformCommissionPercent}
                  onChange={(e) => setPlatformCommissionPercent(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Biaya Layanan Platform</label>
                <input
                  type="number"
                  value={platformServiceFee}
                  onChange={(e) => setPlatformServiceFee(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveOrder}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Pesanan Online
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

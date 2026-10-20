import React, { useState } from 'react';
import { dataService } from '../../services/dataService';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Coffee,
  Package,
  Bike,
  Clock,
  ArrowUpRight,
  Receipt,
  Layers,
  Percent,
} from 'lucide-react';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | 'month'>('today');

  const orders = dataService.getOrders();
  const expenses = dataService.getExpenses();
  const ingredients = dataService.getIngredients();
  const lowStock = ingredients.filter((i) => i.current_stock <= i.minimum_stock);

  // Filter orders by date
  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (o.status === 'dibatalkan') return false;
    const orderDate = new Date(o.created_at);
    if (dateFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return orderDate.toDateString() === yesterday.toDateString();
    }
    if (dateFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }
    if (dateFilter === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Calculate metrics
  const grossSales = filteredOrders.reduce((sum, o) => sum + o.gross_total, 0);
  const totalDiscounts = filteredOrders.reduce((sum, o) => sum + o.discount_amount, 0);
  const netSales = grossSales - totalDiscounts;
  const totalHpp = filteredOrders.reduce((sum, o) => sum + o.total_hpp, 0);
  const grossProfit = netSales - totalHpp;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedOperatingProfit = grossProfit - totalExpenses;

  const totalTransactions = filteredOrders.length;
  const averageTransactionValue = totalTransactions > 0 ? Math.round(grossSales / totalTransactions) : 0;
  const totalItemsSold = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  const offlineSales = filteredOrders.filter((o) => o.channel === 'pos_offline').reduce((sum, o) => sum + o.gross_total, 0);
  const onlineSales = filteredOrders.filter((o) => o.channel !== 'pos_offline').reduce((sum, o) => sum + o.gross_total, 0);
  const platformCommissions = filteredOrders.reduce((sum, o) => sum + o.platform_commission, 0);

  const pendingOnlineOrders = orders.filter((o) => o.status === 'menunggu_konfirmasi');

  // Top selling products
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((i) => {
      if (!productSalesMap[i.product_name]) {
        productSalesMap[i.product_name] = { name: i.product_name, qty: 0, revenue: 0 };
      }
      productSalesMap[i.product_name].qty += i.quantity;
      productSalesMap[i.product_name].revenue += i.subtotal_price;
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Operasional Kopi 99
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Analisis penjualan, HPP resep, laba kotor, dan pesanan Warungboto Yogyakarta
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'yesterday', label: 'Kemarin' },
            { id: '7days', label: '7 Hari Terakhir' },
            { id: 'month', label: 'Bulan Ini' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                dateFilter === item.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Online Orders Alert */}
      {pendingOnlineOrders.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Bike className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-blue-900">
                Ada {pendingOnlineOrders.length} Pesanan Online Menunggu Konfirmasi!
              </span>
              <p className="text-blue-700 mt-0.5">
                Segera konfirmasi pesanan WhatsApp / ShopeeFood agar dapat diproses oleh barista.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('online-orders')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shrink-0 transition"
          >
            Buka Pesanan Online
          </button>
        </div>
      )}

      {/* Core KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Omzet Kotor */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Omzet Kotor</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {formatRupiah(grossSales)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Penjualan bersih: {formatRupiah(netSales)}
          </div>
        </div>

        {/* HPP / COGS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total HPP Resep</span>
            <Coffee className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-2">
            {formatRupiah(totalHpp)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Biaya bahan baku + packaging
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Laba Kotor (Gross Profit)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-2">
            {formatRupiah(grossProfit)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            Margin: {netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Laba Operasional */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Estimasi Laba Operasional</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${estimatedOperatingProfit >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
            {formatRupiah(estimatedOperatingProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Beban ops: {formatRupiah(totalExpenses)}
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Transaksi</span>
          <span className="font-bold text-base text-slate-900">{totalTransactions} order</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Rata-rata Order (AOV)</span>
          <span className="font-bold text-base text-slate-900">{formatRupiah(averageTransactionValue)}</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Produk Terjual</span>
          <span className="font-bold text-base text-slate-900">{totalItemsSold} cup/porsi</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Penjualan Offline Kasir</span>
          <span className="font-bold text-base text-blue-700">{formatRupiah(offlineSales)}</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Penjualan Online</span>
          <span className="font-bold text-base text-emerald-700">{formatRupiah(onlineSales)}</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[10px]">Stok Menipis</span>
          <span className={`font-bold text-base ${lowStock.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {lowStock.length} bahan
          </span>
        </div>
      </div>

      {/* Two Column Grid: Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Produk Terlaris Kopi 99</h2>
              <span className="text-xs text-slate-400">Berdasarkan jumlah cup</span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{p.qty} terjual</span>
                    <span className="text-[10px] text-slate-400 block">{formatRupiah(p.revenue)}</span>
                  </div>
                </div>
              ))}

              {topProducts.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada transaksi pada periode ini
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start"
          >
            <span>Lihat Laporan Lengkap</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Transaksi Terkini</h2>
              <button
                onClick={() => onNavigate('pos')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Ke Kasir POS
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {orders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{ord.order_number}</div>
                    <div className="text-[10px] text-slate-400">
                      {ord.customer_name} • {ord.channel} • {formatDateIndonesian(ord.created_at, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-700">{formatRupiah(ord.gross_total)}</span>
                    <span className={`block text-[9px] font-semibold uppercase ${
                      ord.status === 'selesai' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('online-orders')}
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start"
          >
            <span>Lihat Semua Penjualan Online & Offline</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
